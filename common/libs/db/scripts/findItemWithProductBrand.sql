select
	i.id, i.upc, i.part_number, i.type, i.specification, i.inventory, i.image, i.product_id,
	p.name as Model, p.logo, p.image as pImage, p.description,
	b.name as Brand, b.logo as bLogo, b.image as bImage
from item as i
left join product as p on i.product_id=p.id
left join brand as b on p.brand_id=b.id
WHERE i.id = any($1)
--WHERE i.id = any('{170962, 170961}')
