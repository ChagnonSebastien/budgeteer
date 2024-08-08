package cmd

import (
	"context"
	"fmt"
	"os"
	"strings"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/db/dao"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/grpc"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/http"
	"chagnon.dev/budget-server/pkg/infrastructure/postgres"
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
}

var cfgFile string
var config Config

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Starts the budget server",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("=== Budget Server ===")
		db, err := postgres.NewPostgresDatabase(
			context.Background(),
			config.Database.Host,
			config.Database.User,
			config.Database.Pass,
			config.Database.Name,
			config.Database.Port,
		)
		if err != nil {
			fmt.Println("error creationg connection to database: ", err)
		}

		repos := repository.NewRepository(dao.New(db))

		webServer := http.GrpcWebServer{
			GrpcServer: grpc.NewServerWithHandlers(grpc.Services{
				Account:     service.NewAccountService(repos),
				Category:    service.NewCategoryService(repos),
				Currency:    service.NewCurrencyService(repos),
				Transaction: service.NewTransactionService(repos),
			}),
		}
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
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
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
