-- Additional pet profile details: identification, primary vet contact,
-- allergies/dietary restrictions, and pet insurance — all optional free text.

alter table pets add column microchip_number text;
alter table pets add column vet_name text;
alter table pets add column vet_phone text;
alter table pets add column allergies text;
alter table pets add column insurance_provider text;
alter table pets add column insurance_policy_number text;
