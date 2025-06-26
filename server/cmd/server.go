package cmd

import (
	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/autoupdate"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/grpc"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/http"
	"chagnon.dev/budget-server/pkg/infrastructure/postgres"
	"context"
	"fmt"
	"github.com/coreos/go-oidc"
	"github.com/thejerf/suture/v4"
	"golang.org/x/oauth2"
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

type AuthConfig struct {
	Oidc     OidcConfig
	UserPass UserPassConfig
}

type DatabaseConfig struct {
	Host string
	User string
	Pass string
	Name string
	Port int
}

type ServerConfig struct {
	Database  DatabaseConfig
	Auth      AuthConfig
	PublicUrl string
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
	)
	if err != nil {
		return fmt.Errorf("creating connection to database: %s", err)
	}

	repos := repository.NewRepository(dao.New(db), db)

	var oidcConfig *oauth2.Config
	var verifier *oidc.IDTokenVerifier
	if s.config.Auth.Oidc.Enabled {
		oidcConfig, verifier, err = setupOidcConfig(ctx, s.config.Auth.Oidc, s.config.PublicUrl)
		if err != nil {
			return fmt.Errorf("setting up oidc: %s", err)
		}
	}

	webServer := http.NewServer(
		grpc.NewServerWithHandlers(
			grpc.Services{
				Account:     service.NewAccountService(repos),
				Category:    service.NewCategoryService(repos),
				Currency:    service.NewCurrencyService(repos),
				Transaction: service.NewTransactionService(repos),
			},
		),
		http.NewAuth(
			service.NewUserService(repos),
			s.config.Auth.Oidc.Enabled,
			s.config.Auth.UserPass.Enabled,
			oidcConfig,
			verifier,
			s.config.PublicUrl,
			s.config.Auth.Oidc.ProviderUrl,
		),
	)

	exchangeRateAutoUpdater := autoupdate.NewAutoUpdater(ctx, repos, autoupdate.RunJavascript)
	exchangeRateAutoUpdateScheduler, err := autoupdate.NewScheduler("0 6 * * *", exchangeRateAutoUpdater.NewRunner(ctx))
	if err != nil {
		return fmt.Errorf("setting up the exchange rate auto update scheduler: %s", err)
	}

	rootSupervisor := suture.New("root", suture.Spec{})
	rootSupervisor.Add(webServer)
	rootSupervisor.Add(exchangeRateAutoUpdateScheduler)
	return rootSupervisor.Serve(ctx)
}

func setupOidcConfig(ctx context.Context, oidcConfig OidcConfig, serverPublicUrl string) (
	*oauth2.Config,
	*oidc.IDTokenVerifier,
	error,
) {
	if oidcConfig.ClientId == "" || oidcConfig.ClientSecret == "" || oidcConfig.ProviderUrl == "" {
		return nil, nil, fmt.Errorf("missing configuration parameters")
	}

	provider, err := oidc.NewProvider(ctx, oidcConfig.ProviderUrl)
	if err != nil {
		return nil, nil, fmt.Errorf("creating oidc provider")
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
		), nil
}
