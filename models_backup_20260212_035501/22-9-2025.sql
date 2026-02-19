ALTER TABLE `crash_reports` CHANGE `id` `id` INT(11) NOT NULL AUTO_INCREMENT, add PRIMARY KEY (`id`);

ALTER TABLE `crash_reports` CHANGE `created_at` `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CHANGE `updated_at` `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

DELETE pe1
FROM payment_entries pe1
JOIN payment_entries pe2
  ON pe1.ref_no = pe2.ref_no
 AND pe1.class_code = pe2.class_code
 AND pe1.term = pe2.term
 AND pe1.academic_year = pe2.academic_year
 AND pe1.admission_no = pe2.admission_no
 AND pe1.payment_status = pe2.payment_status
 AND (
       -- Case 1: If pe1 is 'Excluded' and pe2 is not, delete pe1
       (pe1.payment_status = 'Excluded' AND pe2.payment_status <> 'Excluded')
       OR
       -- Case 2: If both have same status, delete the lower item_id (keep higher = updated one)
       (pe1.payment_status = pe2.payment_status AND pe1.item_id < pe2.item_id)
     );

   ALTER TABLE payment_entries
    ADD CONSTRAINT unique_payment_entry
    UNIQUE (ref_no, class_code, term, academic_year, admission_no, payment_status);

ALTER TABLE `payment_entries` ADD `updated_by` VARCHAR(50) NULL DEFAULT NULL AFTER `created_by`;

ALTER TABLE `users` CHANGE `id` `id` INT(11) NOT NULL AUTO_INCREMENT, add PRIMARY KEY (`id`);