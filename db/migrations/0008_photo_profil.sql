-- AUTH-04 : photo de profil téléversée, redimensionnée côté serveur (WebP 256 px)
-- et conservée en base : pas de volume de fichiers à gérer au déploiement.
alter table users
  add column avatar_data bytea,
  add column avatar_updated_at timestamptz;
