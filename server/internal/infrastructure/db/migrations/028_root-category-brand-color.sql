-- +goose Up

-- changeset ?:1792195200000-1
update categories
set icon_background = '#E5582A'
where parent is null
  and icon_color = '#FFFFFF'
  and icon_background = '#757575';
