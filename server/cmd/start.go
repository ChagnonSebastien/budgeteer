package cmd

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"chagnon.dev/budget-server/internal/logging"
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
		GuestLogin struct {
			Enabled            bool   `mapstructure:"enabled"`
			CodeLength         int    `mapstructure:"codeLength"`
			CodeTTLMinutes     int    `mapstructure:"codeTtlMinutes"`
			ResendCooldownSecs int    `mapstructure:"resendCooldownSecs"`
			MaxFailedAttempts  int    `mapstructure:"maxFailedAttempts"`
			BrandName          string `mapstructure:"brandName"`
			SupportEmail       string `mapstructure:"supportEmail"`
		} `mapstructure:"guestLogin"`
	} `mapstructure:"auth"`
	Mailer struct {
		Host        string `mapstructure:"host"`
		Port        int    `mapstructure:"port"`
		Username    string `mapstructure:"username"`
		Password    string `mapstructure:"password"`
		UseSSL      bool   `mapstructure:"useSsl"`
		AuthAuto    bool   `mapstructure:"authAuto"`
		FromAddress string `mapstructure:"fromAddress"`
		ReplyTo     string `mapstructure:"replyTo"`
		UseMock     bool   `mapstructure:"useMock"`
	} `mapstructure:"mailer"`
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
				GuestLogin: GuestLoginConfig{
					Enabled:            config.Auth.GuestLogin.Enabled,
					CodeLength:         config.Auth.GuestLogin.CodeLength,
					CodeTTLMinutes:     config.Auth.GuestLogin.CodeTTLMinutes,
					ResendCooldownSecs: config.Auth.GuestLogin.ResendCooldownSecs,
					MaxFailedAttempts:  config.Auth.GuestLogin.MaxFailedAttempts,
					BrandName:          config.Auth.GuestLogin.BrandName,
					SupportEmail:       config.Auth.GuestLogin.SupportEmail,
				},
			},
			Mailer: MailerConfig{
				Host:        config.Mailer.Host,
				Port:        config.Mailer.Port,
				Username:    config.Mailer.Username,
				Password:    config.Mailer.Password,
				UseSSL:      config.Mailer.UseSSL,
				AuthAuto:    config.Mailer.AuthAuto,
				FromAddress: config.Mailer.FromAddress,
				ReplyTo:     config.Mailer.ReplyTo,
				UseMock:     config.Mailer.UseMock,
			},
			PublicUrl: config.Server.PublicUrl,
		}}

		logger := logging.NewLogger(slog.LevelInfo, false)
		slog.SetDefault(logger)

		err := server.Serve(logging.WithLogger(context.Background(), logger))
		if err != nil {
			logger.Error("running server: %s", err)
			panic(err)
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
