-- Valeur EXPIRED ajoutée à l'enum ShiftStatus.
-- Le cron /api/cron/reminders écrit ce statut (annonce OPEN, date passée > 24 h,
-- sans kok choisi) puis envoie les e-mails de relance. Sans cette migration,
-- l'UPDATE échoue en production (valeur absente du type Postgres).
-- IF NOT EXISTS : sûr à rejouer. Prisma n'enveloppe pas les migrations dans
-- une transaction, ADD VALUE est donc autorisé ici.
ALTER TYPE "ShiftStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
