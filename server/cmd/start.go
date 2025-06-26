package cmd

import (
	"chagnon.dev/budget-server/internal/logging"
	"context"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

type Config struct {
	Database struct {
		Host string `mapstructure:"host"`
		Port int    `mapstructure:"port"`
		User string `mapstructure:"user"`
		Pass string `mapstructure:"password"`
		Name string `mapstructure:"name"`
	} `mapstructure:"database"`
	Auth struct {
		Oidc struct {
			Enabled      bool   `mapstructure:"enabled"`
			ClientId     string `mapstructure:"clientId"`
			ClientSecret string `mapstructure:"clientSecret"`
			ProviderUrl  string `mapstructure:"providerUrl"`
		} `mapstructure:"oidc"`
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
		server := &Server{config: ServerConfig{
			Database: DatabaseConfig{
				Host: config.Database.Host,
				User: config.Database.User,
				Pass: config.Database.Pass,
				Name: config.Database.Name,
				Port: config.Database.Port,
			},
			Auth: AuthConfig{
				Oidc: OidcConfig{
					Enabled:      config.Auth.Oidc.Enabled,
					ProviderUrl:  config.Auth.Oidc.ProviderUrl,
					ClientId:     config.Auth.Oidc.ClientId,
					ClientSecret: config.Auth.Oidc.ClientSecret,
				},
				UserPass: UserPassConfig{
					Enabled: config.Auth.UserPass.Enabled,
				},
			},
			PublicUrl: config.Server.PublicUrl,
		}}

		logger := logging.NewLogger(slog.LevelInfo, false)
		slog.SetDefault(logger)

		err := server.Serve(logging.WithLogger(context.Background(), logger))
		if err != nil {
			log.Fatal(fmt.Errorf("running server: %s", err))
		}
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
