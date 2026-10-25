-- +goose Up

-- changeset ?:1792955248000-1
delete from accountcurrencies ac
using accounts a, currencies c
where ac.account_id = a.id
  and ac.currency_id = c.id
  and a.user_id <> c.user_id;
