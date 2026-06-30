-- Unikalność e-maila gościa w obrębie organizacji (NULL dozwolone wielokrotnie).
CREATE UNIQUE INDEX "Guest_organizationId_email_key" ON "Guest"("organizationId", "email");
