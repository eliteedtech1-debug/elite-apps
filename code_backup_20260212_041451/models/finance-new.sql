 ALTER TABLE `loans` DROP INDEX `loan_reference_2`;  
 ALTER TABLE `loans` DROP INDEX `loan_reference_3`; 
  ALTER TABLE `loans` DROP INDEX `loan_reference_4`; 
   ALTER TABLE `loans` DROP INDEX `loan_reference_5`; 
    ALTER TABLE `loans` DROP INDEX `loan_reference_6`; 
     ALTER TABLE `loans` DROP INDEX `loan_reference_7`; 
      ALTER TABLE `loans` DROP INDEX `loan_reference_8`; 
      ALTER TABLE `loans` DROP INDEX `loan_reference_9`; 
ALTER TABLE `loans` DROP FOREIGN KEY `loans_ibfk_29`;
ALTER TABLE `loans` ADD  CONSTRAINT `loans_ibfk_29` FOREIGN KEY (`staff_id`) REFERENCES `teachers`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE `loans` DROP FOREIGN KEY `loans_ibfk_30`;
ALTER TABLE `loans` ADD  CONSTRAINT `loans_ibfk_30` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `loans` DROP FOREIGN KEY `loans_ibfk_31`;
ALTER TABLE `loans` ADD  CONSTRAINT `loans_ibfk_31` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `loans` DROP FOREIGN KEY `loans_ibfk_33`;
ALTER TABLE `loans` ADD  CONSTRAINT `loans_ibfk_33` FOREIGN KEY (`suspended_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `loans` CHANGE `status` `status` ENUM('pending','active','completed','suspended','rejected','defaulted') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'active';

ALTER TABLE `loans` CHANGE `approval_status` `approval_status` ENUM('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'approved';

ALTER TABLE `loans` CHANGE `guarantor_approval_status` `guarantor_approval_status` ENUM('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'approved';