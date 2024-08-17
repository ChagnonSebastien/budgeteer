package cmd

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/coreos/go-oidc"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"golang.org/x/oauth2"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/grpc"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/http"
	"chagnon.dev/budget-server/pkg/infrastructure/postgres"
)

type OidcConfig struct {
	Enabled      bool   `mapstructure:"enabled"`
	ClientId     string `mapstructure:"clientId"`
	ClientSecret string `mapstructure:"clientSecret"`
	ProviderUrl  string `mapstructure:"providerUrl"`
}

type Config struct {
	Database struct {
		Host string `mapstructure:"host"`
		Port int    `mapstructure:"port"`
		User string `mapstructure:"user"`
		Pass string `mapstructure:"password"`
		Name string `mapstructure:"name"`
	} `mapstructure:"database"`
	Auth struct {
		Oidc     OidcConfig `mapstructure:"oidc"`
		UserPass struct {
			Enabled bool `mapstructure:"enabled"`
		} `mapstructure:"userpass"`
	} `mapstructure:"auth"`
	Server struct {
		PublicUrl string `mapstructure:"publicUrl"`
	} `mapstructure:"server"`
}

var cfgFile string
var config Config

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Starts the budget server",
	Run: func(cmd *cobra.Command, args []string) {
		ctx := context.Background()

		fmt.Println("=== Budget Server ===")
		db, err := postgres.NewPostgresDatabase(
			config.Database.Host,
			config.Database.User,
			config.Database.Pass,
			config.Database.Name,
			config.Database.Port,
		)
		if err != nil {
			log.Fatal("error creating connection to database: ", err)
		}

		repos := repository.NewRepository(dao.New(db))

		var oidcConfig *oauth2.Config
		var verifier *oidc.IDTokenVerifier
		if config.Auth.Oidc.Enabled {
			oidcConfig, verifier = setupOidcConfig(ctx, config.Auth.Oidc, config.Server.PublicUrl)
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
				config.Auth.Oidc.Enabled,
				config.Auth.UserPass.Enabled,
				oidcConfig,
				verifier,
				config.Server.PublicUrl,
				config.Auth.Oidc.ProviderUrl,
			),
		)
		webServer.Serve()
	},
}

func init() {
	cobra.OnInitialize(initConfig)
	rootCmd.AddCommand(startCmd)
	startCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file path")
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		viper.SetConfigName("default.config")
		viper.SetConfigType("yaml")
		viper.AddConfigPath("./configs")
	}

	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	if err := viper.ReadInConfig(); err != nil {
		var configFileNotFoundError viper.ConfigFileNotFoundError
		if errors.As(err, &configFileNotFoundError) {
			fmt.Println("Config file not found, proceeding without it")
			return
		}

		fmt.Println("error reading config file: %w", err)
		os.Exit(1)
	}

	if err := viper.Unmarshal(&config); err != nil {
		fmt.Println("unable to decode into struct: %w", err)
		os.Exit(1)
	}
}

func setupOidcConfig(ctx context.Context, oidcConfig OidcConfig, serverPublicUrl string) (
	*oauth2.Config,
	*oidc.IDTokenVerifier,
) {
	if oidcConfig.ClientId == "" || oidcConfig.ClientSecret == "" || oidcConfig.ProviderUrl == "" {
		return nil, nil
	}

	provider, err := oidc.NewProvider(ctx, oidcConfig.ProviderUrl)
	if err != nil {
		log.Fatal(err)
	}

	return &oauth2.Config{
			ClientID:     oidcConfig.ClientId,
			ClientSecret: oidcConfig.ClientSecret,
			Endpoint:     provider.Endpoint(),
			RedirectURL:  fmt.Sprintf("%s/auth/callback", serverPublicUrl),
			Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
		}, provider.Verifier(
			&oidc.Config{
				ClientID:          oidcConfig.ClientId,
				SkipClientIDCheck: true,
			},
		)
}
