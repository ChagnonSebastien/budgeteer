-- liquibase formatted sql

-- changeset ?:1792108800000-1
update categories
set icon_color = '#FFFFFF', icon_background = '#757575'
where parent is null
  and icon_color = 'rgb(53, 44, 77)'
  and icon_background = 'rgb(242, 198, 230)';
