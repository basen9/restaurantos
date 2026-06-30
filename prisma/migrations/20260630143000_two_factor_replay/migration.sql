-- Ochrona przed replay kodu TOTP: ostatni zaakceptowany krok czasowy.
ALTER TABLE "User" ADD COLUMN "twoFactorLastStep" BIGINT NOT NULL DEFAULT 0;
