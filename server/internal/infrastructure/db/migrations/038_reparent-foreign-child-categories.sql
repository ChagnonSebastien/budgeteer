-- +goose Up

-- changeset ?:1792955410000-1
update categories c
set parent = (select r.id from categories r where r.user_id = c.user_id and r.parent is null order by r.id limit 1)
from categories p
where c.parent = p.id
  and p.user_id <> c.user_id;
