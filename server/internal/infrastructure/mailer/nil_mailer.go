package mailer

import (
	"context"
	"fmt"
)

type NilService struct {
	cfg Config
}

func NewNilMailer() *NilService {
	return &NilService{}
}

func (s *NilService) Send(_ context.Context, _ []string, _, textBody, _ string) error {
	fmt.Println(textBody)
	return nil
}
