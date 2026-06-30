-- AddForeignKey
ALTER TABLE "TableOrder" ADD CONSTRAINT "TableOrder_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
