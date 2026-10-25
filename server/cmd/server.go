package cmd

import (
	"context"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/logging"
	"github.com/coreos/go-oidc"
	"github.com/thejerf/suture/v4"
	"golang.org/x/oauth2"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/autoupdate"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/mailer"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/grpc"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/http"
	"chagnon.dev/budget-server/pkg/infrastructure/postgres"
)

type OidcConfig struct {
	Enabled      bool
	ProviderUrl  string
	ClientId     string
	ClientSecret string
}

type UserPassConfig struct {
	Enabled bool
}

type GuestLoginConfig struct {
	Enabled            bool
	CodeLength         int
	CodeTTLMinutes     int
	ResendCooldownSecs int
	MaxFailedAttempts  int
	BrandName          string
	SupportEmail       string
}

type MailerConfig struct {
	Host        string
	Port        int
	Username    string
	Password    string
	UseSSL      bool
	AuthAuto    bool
	FromAddress string
	ReplyTo     string
	UseMock     bool
}

type AuthConfig struct {
	Oidc       OidcConfig
	UserPass   UserPassConfig
	GuestLogin GuestLoginConfig
}

type DatabaseConfig struct {
	Host    string
	User    string
	Pass    string
	Name    string
	Port    int
	SslMode string
}

type ServerConfig struct {
	Database       DatabaseConfig
	Auth           AuthConfig
	Mailer         MailerConfig
	PublicUrl      string
	ClientIPHeader string
}

type Server struct {
	config ServerConfig
}

func (s *Server) Serve(ctx context.Context) error {
	fmt.Println("=== Budget Server ===")
	db, err := postgres.NewPostgresDatabase(
		ctx,
		s.config.Database.Host,
		s.config.Database.User,
		s.config.Database.Pass,
		s.config.Database.Name,
		s.config.Database.Port,
		s.config.Database.SslMode,
	)
	if err != nil {
		return fmt.Errorf("creating connection to database: %s", err)
	}

	repos := repository.NewRepository(dao.New(db), db)

	var oidcConfig *oauth2.Config
	var verifier *oidc.IDTokenVerifier
	var oidcRevocationEndpoint string
	if s.config.Auth.Oidc.Enabled {
		oidcConfig, verifier, oidcRevocationEndpoint, err = setupOidcConfig(ctx, s.config.Auth.Oidc, s.config.PublicUrl)
		if err != nil {
			return fmt.Errorf("setting up oidc: %s", err)
		}
	}

	var mailerService interface {
		Send(ctx context.Context, to []string, subject, textBody, htmlBody string) error
	}
	if s.config.Mailer.UseMock {
		logging.FromContext(ctx).Info("Nil mailer is enabled. Printing mails into logs.")
		mailerService = mailer.NewNilMailer()
	} else if s.config.Mailer.Host != "" && s.config.Mailer.Username != "" && s.config.Mailer.Password != "" {
		mailerService = mailer.NewMailer(mailer.Config{
			Host:        s.config.Mailer.Host,
			Port:        s.config.Mailer.Port,
			Username:    s.config.Mailer.Username,
			Password:    s.config.Mailer.Password,
			UseSSL:      s.config.Mailer.UseSSL,
			AuthAuto:    s.config.Mailer.AuthAuto,
			FromAddress: s.config.Mailer.FromAddress,
			ReplyTo:     s.config.Mailer.ReplyTo,
		})
	}

	guestLoginEnabled := s.config.Auth.GuestLogin.Enabled
	if guestLoginEnabled && mailerService == nil {
		logging.FromContext(ctx).Info("Mailer is not configured. Guest login is disabled.")
		guestLoginEnabled = false
	}

	// Create guest login service from config
	var guestLoginService *service.GuestLoginService
	if guestLoginEnabled {
		codeLength := s.config.Auth.GuestLogin.CodeLength
		if codeLength == 0 {
			codeLength = 8
		}
		codeTTLMinutes := s.config.Auth.GuestLogin.CodeTTLMinutes
		if codeTTLMinutes == 0 {
			codeTTLMinutes = 15
		}
		resendCooldownSecs := s.config.Auth.GuestLogin.ResendCooldownSecs
		if resendCooldownSecs == 0 {
			resendCooldownSecs = 300
		}
		maxFailedAttempts := s.config.Auth.GuestLogin.MaxFailedAttempts
		if maxFailedAttempts == 0 {
			maxFailedAttempts = 3
		}
		brandName := s.config.Auth.GuestLogin.BrandName
		if brandName == "" {
			brandName = "Fintrospect"
		}

		guestLoginService, err = service.NewGuestLoginService(
			repos,
			mailerService,
			service.GuestLoginConfig{
				CodeLength:         codeLength,
				CodeTTL:            time.Duration(codeTTLMinutes) * time.Minute,
				CodeResendCooldown: time.Duration(resendCooldownSecs) * time.Second,
				MaxFailedAttempts:  maxFailedAttempts,
				BrandName:          brandName,
				BrandURL:           s.config.PublicUrl,
				SupportEmail:       s.config.Auth.GuestLogin.SupportEmail,
			},
		)
		if err != nil {
			return fmt.Errorf("creating guest login service: %s", err)
		}
	}

	webServer := http.NewServer(
		grpc.NewServerWithHandlers(
			grpc.Services{
				Account:                repos,
				Category:               service.NewCategoryService(repos),
				Currency:               repos,
				Transaction:            repos,
				ExchangeRate:           repos,
				TransactionGroup:       repos,
				UnconfirmedTransaction: repos,
				Settlement:             repos,
				Import:                 repos,
				User:                   repos,
			},
		),
		http.NewAuth(
			repos,                          // userService
			guestLoginService,              // guestLoginService
			s.config.Auth.Oidc.Enabled,     // oidcEnabled
			s.config.Auth.UserPass.Enabled, // userPassEnabled
			guestLoginEnabled,              // guestEnabled
			oidcConfig,                     // oidcConfig
			verifier,                       // verifier
			s.config.PublicUrl,             // serverPublicUrl
			s.config.Auth.Oidc.ProviderUrl, // oidcIssuer
			oidcRevocationEndpoint,         // oidcRevocationEndpoint
			s.config.ClientIPHeader,        // clientIPHeader
		),
	)

	exchangeRateAutoUpdater := autoupdate.NewAutoUpdater(ctx, repos, autoupdate.RunJavascript)
	exchangeRateAutoUpdateScheduler, err := autoupdate.NewScheduler("exchange rate auto update", "0 6 * * *", exchangeRateAutoUpdater.NewRunner())
	if err != nil {
		return fmt.Errorf("setting up the exchange rate auto update scheduler: %s", err)
	}

	rootSupervisor := suture.New("root", suture.Spec{})
	rootSupervisor.Add(webServer)
	rootSupervisor.Add(exchangeRateAutoUpdateScheduler)

	if guestLoginService != nil {
		guestLoginCleanupScheduler, err := autoupdate.NewScheduler("guest login cleanup", "@hourly", func(ctx context.Context) error {
			if err := guestLoginService.CleanupExpired(ctx); err != nil {
				logging.FromContext(ctx).Error("deleting expired guest logins", "error", err)
			}
			return nil
		})
		if err != nil {
			return fmt.Errorf("setting up the guest login cleanup scheduler: %s", err)
		}
		rootSupervisor.Add(guestLoginCleanupScheduler)
	}

	return rootSupervisor.Serve(ctx)
}

func setupOidcConfig(ctx context.Context, oidcConfig OidcConfig, serverPublicUrl string) (
	*oauth2.Config,
	*oidc.IDTokenVerifier,
	string,
	error,
) {
	if oidcConfig.ClientId == "" || oidcConfig.ClientSecret == "" || oidcConfig.ProviderUrl == "" {
		return nil, nil, "", fmt.Errorf("missing configuration parameters")
	}

	provider, err := oidc.NewProvider(ctx, oidcConfig.ProviderUrl)
	if err != nil {
		return nil, nil, "", fmt.Errorf("creating oidc provider")
	}

	var discovery struct {
		RevocationEndpoint string `json:"revocation_endpoint"`
	}
	if err := provider.Claims(&discovery); err != nil {
		return nil, nil, "", fmt.Errorf("reading oidc discovery document: %w", err)
	}
	if discovery.RevocationEndpoint == "" {
		logging.FromContext(ctx).Warn("OIDC provider has no revocation endpoint: logout cannot revoke refresh tokens")
	}

	return &oauth2.Config{
			ClientID:     oidcConfig.ClientId,
			ClientSecret: oidcConfig.ClientSecret,
			Endpoint:     provider.Endpoint(),
			RedirectURL:  fmt.Sprintf("%s/auth/callback", serverPublicUrl),
			Scopes:       []string{oidc.ScopeOpenID, oidc.ScopeOfflineAccess, "profile", "email"},
		}, provider.Verifier(
			&oidc.Config{
				ClientID:          oidcConfig.ClientId,
				SkipClientIDCheck: true,
			},
		), discovery.RevocationEndpoint, nil
}
