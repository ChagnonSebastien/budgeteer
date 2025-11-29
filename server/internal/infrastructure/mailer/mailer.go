package mailer

import (
	"context"
	"fmt"

	"github.com/wneessen/go-mail"
)

type Config struct {
	Host        string
	Port        int
	Username    string
	Password    string
	UseSSL      bool
	ReplyTo     string
	FromAddress string
	AuthAuto    bool
}

type Service struct {
	cfg Config
}

func NewMailer(cfg Config) *Service {
	if cfg.FromAddress == "" {
		cfg.FromAddress = cfg.Username
	}

	return &Service{cfg: cfg}
}

func (s *Service) Send(ctx context.Context, to []string, subject, textBody, htmlBody string) error {
	if len(to) == 0 {
		return fmt.Errorf("no recipients")
	}

	// Build message
	msg := mail.NewMsg()
	if err := msg.From(s.cfg.FromAddress); err != nil {
		return fmt.Errorf("set From: %w", err)
	}
	for _, rcpt := range to {
		if err := msg.To(rcpt); err != nil {
			return fmt.Errorf("add To: %w", err)
		}
	}
	if s.cfg.ReplyTo != "" {
		// Prefer the dedicated API instead of a raw header
		if err := msg.ReplyTo(s.cfg.ReplyTo); err != nil {
			return fmt.Errorf("set Reply-To: %w", err)
		}
	}

	msg.Subject(subject)

	// Bodies (text/plain is the primary; HTML as an alternative if provided)
	if textBody == "" && htmlBody == "" {
		return fmt.Errorf("empty body")
	}
	if textBody != "" {
		msg.SetBodyString(mail.TypeTextPlain, textBody)
	}
	if htmlBody != "" {
		// Add as an alternative so MUAs can choose the best part
		msg.AddAlternativeString(mail.TypeTextHTML, htmlBody)
	}

	// Build client (options mirror the official docs)
	opts := []mail.Option{
		mail.WithPort(s.cfg.Port),
	}
	if s.cfg.AuthAuto {
		opts = append(opts, mail.WithSMTPAuth(mail.SMTPAuthAutoDiscover))
	}
	if s.cfg.Username != "" {
		opts = append(opts, mail.WithUsername(s.cfg.Username))
	}
	if s.cfg.Password != "" {
		opts = append(opts, mail.WithPassword(s.cfg.Password))
	}

	client, err := mail.NewClient(s.cfg.Host, opts...)
	if err != nil {
		return fmt.Errorf("create client: %w", err)
	}

	// TLS: Gmail on 587 expects STARTTLS. Enforce it with TLSMandatory.
	// If you need implicit TLS (port 465), set UseSSL=true.
	if s.cfg.UseSSL {
		// implicit TLS (aka SMTPS on 465)
		client.SetSSL(true)
	} else {
		// STARTTLS required; fail if TLS cannot be established
		client.SetTLSPolicy(mail.TLSMandatory)
	}

	// Send
	if err := client.DialAndSendWithContext(ctx, msg); err != nil {
		return fmt.Errorf("send mail: %w", err)
	}
	return nil
}
