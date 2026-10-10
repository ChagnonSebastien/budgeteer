-- liquibase formatted sql

-- changeset ?:1792195200000-1
update categories
set icon_background = '#C84B31'
where parent is null
  and icon_color = '#FFFFFF'
  and icon_background = '#757575';
