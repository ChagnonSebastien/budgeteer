-- +goose Up

update categories c
set icon_name = m.new_name
from (values
  ('GrGamepad', 'FaGamepad'),
  ('IoBook', 'FaBook'),
  ('IoFastFood', 'FaBurger'),
  ('IoHeart', 'FaHeart'),
  ('IoLogoAmazon', 'FaAmazon'),
  ('IoRestaurant', 'FaUtensils'),
  ('IoShield', 'FaShieldHalved'),
  ('BiChip', 'TbCpu'),
  ('BiSolidJoystickButton', 'FaGamepad'),
  ('BiSolidMask', 'FaMasksTheater'),
  ('BiSolidParty', 'TbConfetti'),
  ('BiSolidStoreAlt', 'FaStore'),
  ('BiSolidTShirt', 'FaShirt'),
  ('BsBoxes', 'TbBoxMultiple'),
  ('BsFillHouseDoorFill', 'FaHouse'),
  ('BsPhoneFill', 'FaMobileScreen')
) as m(old_name, new_name)
where c.icon_name = m.old_name;
