-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_inventoryItemId_idx" ON "InvoiceItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "Message_recipientId_senderId_createdAt_idx" ON "Message"("recipientId", "senderId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecipeItem_recipeId_idx" ON "RecipeItem"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeItem_inventoryItemId_idx" ON "RecipeItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");

-- CreateIndex
CREATE INDEX "WasteReport_organizationId_userId_createdAt_idx" ON "WasteReport"("organizationId", "userId", "createdAt");
