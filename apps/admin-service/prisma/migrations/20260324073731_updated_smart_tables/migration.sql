-- AddForeignKey
ALTER TABLE "SmartMatchyEmployment" ADD CONSTRAINT "SmartMatchyEmployment_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "SmartMatchyBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartMatchyHousing" ADD CONSTRAINT "SmartMatchyHousing_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "SmartMatchyBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartMatchySocialSupport" ADD CONSTRAINT "SmartMatchySocialSupport_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "SmartMatchyBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartMatchyProfessional" ADD CONSTRAINT "SmartMatchyProfessional_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "SmartMatchyBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
