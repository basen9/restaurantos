-- Tylko jedna OTWARTA zmiana kasowa na (organizacja, lokal) — twardy guard wyścigu otwarcia.
CREATE UNIQUE INDEX "CashSession_one_open_per_location"
  ON "CashSession" ("organizationId", "locationId")
  WHERE status = 'OPEN';
