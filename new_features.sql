-- MariaDB dump 10.19  Distrib 10.4.28-MariaDB, for osx10.10 (x86_64)
--
-- Host: localhost    Database: elite_test_db
-- ------------------------------------------------------
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `lesson_comments`
--

DROP TABLE IF EXISTS `lesson_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lesson_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(15) NOT NULL,
  `user_name` varchar(50) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lesson_id` int(11) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_comments`
--

LOCK TABLES `lesson_comments` WRITE;
/*!40000 ALTER TABLE `lesson_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `lesson_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lesson_notes`
--

DROP TABLE IF EXISTS `lesson_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lesson_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lesson_plan_id` int(11) NOT NULL,
  `note_type` enum('reflection','feedback','improvement','observation') DEFAULT 'reflection',
  `content` text NOT NULL,
  `created_by` int(11) NOT NULL,
  `is_private` tinyint(1) DEFAULT 0,
  `school_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lesson_notes_lesson_plan_id` (`lesson_plan_id`),
  KEY `lesson_notes_created_by` (`created_by`),
  KEY `lesson_notes_school_id` (`school_id`),
  KEY `lesson_notes_note_type` (`note_type`),
  KEY `lesson_notes_created_by_created_at` (`created_by`,`created_at`),
  CONSTRAINT `lesson_notes_ibfk_1` FOREIGN KEY (`lesson_plan_id`) REFERENCES `lesson_plans` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `lesson_notes_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_notes`
--

LOCK TABLES `lesson_notes` WRITE;
/*!40000 ALTER TABLE `lesson_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `lesson_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lesson_plans`
--

DROP TABLE IF EXISTS `lesson_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lesson_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `subject_code` varchar(50) NOT NULL,
  `class_code` varchar(50) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `lesson_date` datetime NOT NULL,
  `duration_minutes` int(11) DEFAULT 40,
  `objectives` text DEFAULT NULL,
  `content` text DEFAULT NULL,
  `activities` text DEFAULT NULL,
  `resources` text DEFAULT NULL,
  `assessment_methods` text DEFAULT NULL,
  `homework` text DEFAULT NULL,
  `status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `school_id` varchar(20) DEFAULT NULL,
  `branch_id` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `syllabus_id` varchar(50) DEFAULT NULL,
  `syllabus_topic` varchar(255) DEFAULT NULL,
  `nerdc_alignment` text DEFAULT NULL,
  `ai_generated` tinyint(1) DEFAULT 0,
  `ai_model_used` varchar(50) DEFAULT NULL,
  `ai_prompt_version` varchar(20) DEFAULT NULL,
  `teacher_edit_percentage` int(11) DEFAULT NULL,
  `syllabus_topics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`syllabus_topics`)),
  `curriculum_alignment_percentage` int(11) DEFAULT 0,
  `syllabus_coverage_tags` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lesson_plans_school_id` (`school_id`),
  KEY `lesson_plans_teacher_id` (`teacher_id`),
  KEY `lesson_plans_subject_code` (`subject_code`),
  KEY `lesson_plans_class_code` (`class_code`),
  KEY `lesson_plans_lesson_date` (`lesson_date`),
  KEY `lesson_plans_status` (`status`),
  CONSTRAINT `lesson_plans_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_plans`
--

LOCK TABLES `lesson_plans` WRITE;
/*!40000 ALTER TABLE `lesson_plans` DISABLE KEYS */;
INSERT INTO `lesson_plans` VALUES (2,'Understanding Living Things','Basic Science & Technology','JSS1',1013,'2026-01-01 01:11:20',40,NULL,NULL,NULL,NULL,NULL,NULL,'draft','SCH/20',NULL,'2026-01-01 01:11:20',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'[1]',85,NULL);
/*!40000 ALTER TABLE `lesson_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lesson_time_table`
--

DROP TABLE IF EXISTS `lesson_time_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lesson_time_table` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `day` varchar(20) NOT NULL,
  `class_name` varchar(50) NOT NULL,
  `subject` varchar(50) NOT NULL,
  `teacher_id` int(10) NOT NULL,
  `section` varchar(50) NOT NULL,
  `school_location` varchar(150) DEFAULT NULL,
  `start_time` varchar(20) NOT NULL,
  `end_time` varchar(20) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) NOT NULL,
  `class_code` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `lesson_time_table_school_id` (`school_id`),
  KEY `lesson_time_table_section` (`section`),
  KEY `lesson_time_table_class_name` (`class_name`),
  KEY `lesson_time_table_teacher_id` (`teacher_id`),
  KEY `lesson_time_table_day` (`day`),
  KEY `lesson_time_table_school_id_section_class_name` (`school_id`,`section`,`class_name`)
) ENGINE=InnoDB AUTO_INCREMENT=220 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_time_table`
--

LOCK TABLES `lesson_time_table` WRITE;
/*!40000 ALTER TABLE `lesson_time_table` DISABLE KEYS */;
INSERT INTO `lesson_time_table` VALUES (4,'Monday','Nursery 1','English Language',2,'','BRCH00001','8:00: AM','8:45: AM','Active','SCH/1','BRCH00001','CLS0001','2025-09-23 13:16:29','2025-09-23 13:16:29'),(5,'Monday','Nursery 1','DRAWING',11,'Nursery','BRCH00003','7:30 PM','1:40 PM','Active','SCH/12','BRCH00003','CLS0239','2025-09-29 15:17:25','2025-09-29 15:17:25'),(6,'Monday','SS1 A','English Language',137,'SS','BRCH00027','08:00','08:45','Active','SCH/20','BRCH00027','CLS0560','2025-11-17 11:22:04','2025-11-17 11:22:04'),(80,'Monday','Pre-Nursery','Rhymes',265,'Nursery',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(81,'Monday','Pre-Nursery','Physical Development',265,'Nursery',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(82,'Monday','Pre-Nursery','Personal & Social Development',265,'Nursery',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(83,'Monday','Nursery 1 A','Personal & Social Development',277,'Nursery',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0594','2025-12-31 17:18:35','2025-12-31 17:18:35'),(84,'Monday','Pre-Nursery','Knowledge & Undestanding',265,'Nursery',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(85,'Monday','Nursery 2 A','Physical Development',271,'Nursery',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:35','2025-12-31 17:18:35'),(86,'Monday','Pre-Nursery','Numeracy',265,'Nursery',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(87,'Tuesday','Pre-Nursery','Rhymes',265,'Nursery',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(88,'Tuesday','Pre-Nursery','Physical Development',265,'Nursery',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(89,'Tuesday','Pre-Nursery','Personal & Social Development',265,'Nursery',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(90,'Tuesday','Nursery 2 A','Rhymes',271,'Nursery',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:35','2025-12-31 17:18:35'),(91,'Tuesday','Nursery 1 B','Literacy',278,'Nursery',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:35','2025-12-31 17:18:35'),(92,'Tuesday','Nursery 1 A','Knowledge & Undestanding',277,'Nursery',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0594','2025-12-31 17:18:35','2025-12-31 17:18:35'),(93,'Tuesday','Pre-Nursery','Literacy',265,'Nursery',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(94,'Wednesday','Pre-Nursery','Rhymes',265,'Nursery',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(95,'Wednesday','Pre-Nursery','Physical Development',265,'Nursery',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(96,'Wednesday','Pre-Nursery','Personal & Social Development',265,'Nursery',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:35','2025-12-31 17:18:35'),(97,'Wednesday','Nursery 2 A','Knowledge & Undestanding',271,'Nursery',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:36','2025-12-31 17:18:36'),(98,'Wednesday','Pre-Nursery','Numeracy',265,'Nursery',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(99,'Wednesday','Nursery 2 A','Numeracy',271,'Nursery',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:36','2025-12-31 17:18:36'),(100,'Wednesday','Nursery 1 A','Numeracy',277,'Nursery',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0594','2025-12-31 17:18:36','2025-12-31 17:18:36'),(101,'Thursday','Pre-Nursery','Rhymes',265,'Nursery',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(102,'Thursday','Pre-Nursery','Physical Development',265,'Nursery',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(103,'Thursday','Pre-Nursery','Personal & Social Development',265,'Nursery',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(104,'Thursday','Nursery 2 A','Personal & Social Development',271,'Nursery',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:36','2025-12-31 17:18:36'),(105,'Thursday','Nursery 1 B','Jolly Phonics',278,'Nursery',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:36','2025-12-31 17:18:36'),(106,'Thursday','Nursery 1 B','Creative Development',278,'Nursery',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:36','2025-12-31 17:18:36'),(107,'Thursday','Nursery 1 B','Handwriting',278,'Nursery',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:36','2025-12-31 17:18:36'),(108,'Friday','Pre-Nursery','Rhymes',265,'Nursery',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(109,'Friday','Pre-Nursery','Physical Development',265,'Nursery',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(110,'Friday','Pre-Nursery','Personal & Social Development',265,'Nursery',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(111,'Friday','Nursery 1 B','Literacy',278,'Nursery',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:36','2025-12-31 17:18:36'),(112,'Friday','Pre-Nursery','Creative Development',265,'Nursery',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0541','2025-12-31 17:18:36','2025-12-31 17:18:36'),(113,'Friday','Nursery 1 B','Handwriting',278,'Nursery',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0593','2025-12-31 17:18:36','2025-12-31 17:18:36'),(114,'Friday','Nursery 2 A','Jolly Phonics',271,'Nursery',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0591','2025-12-31 17:18:36','2025-12-31 17:18:36'),(185,'Monday','Primary 5 A','Mathematics',266,'Primary',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(186,'Monday','Primary 4 A','Mathematics',272,'Primary',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(187,'Monday','Primary 3 A','Mathematics',264,'Primary',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(188,'Monday','Primary 4 A','Quantitative Reasoning',272,'Primary',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(189,'Monday','Primary 5 A','National Value',266,'Primary',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(190,'Monday','Primary 4 A','Basic Science & Technology (BST)',272,'Primary',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(191,'Monday','Primary 5 A','Pre-Vocational Studies',266,'Primary',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(192,'Tuesday','Primary 5 A','Mathematics',266,'Primary',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(193,'Tuesday','Primary 4 A','Mathematics',272,'Primary',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(194,'Tuesday','Primary 3 A','Mathematics',264,'Primary',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(195,'Tuesday','Primary 3 A','Hand Writing',264,'Primary',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(196,'Tuesday','Primary 4 A','Verbal Reasoning',272,'Primary',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(197,'Tuesday','Primary 1 A','Mathematics',270,'Primary',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0576','2025-12-31 18:32:15','2025-12-31 18:32:15'),(198,'Tuesday','Primary 1 A','Pre-Vocational Studies',270,'Primary',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0576','2025-12-31 18:32:15','2025-12-31 18:32:15'),(199,'Wednesday','Primary 5 A','Mathematics',266,'Primary',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(200,'Wednesday','Primary 4 A','Mathematics',272,'Primary',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(201,'Wednesday','Primary 3 A','Mathematics',264,'Primary',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(202,'Wednesday','Primary 3 A','English Language',264,'Primary',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(203,'Wednesday','Primary 3 A','Quantitative Reasoning',264,'Primary',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(204,'Wednesday','Primary 1 A','Creative Art',270,'Primary',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0576','2025-12-31 18:32:15','2025-12-31 18:32:15'),(205,'Wednesday','Primary 1 A','Hand Writing',270,'Primary',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0576','2025-12-31 18:32:15','2025-12-31 18:32:15'),(206,'Thursday','Primary 5 A','Mathematics',266,'Primary',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(207,'Thursday','Primary 4 A','Mathematics',272,'Primary',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(208,'Thursday','Primary 3 A','Mathematics',264,'Primary',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(209,'Thursday','Primary 3 A','English Language',264,'Primary',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(210,'Thursday','Primary 4 A','Quantitative Reasoning',272,'Primary',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(211,'Thursday','Primary 5 A','Hand Writing',266,'Primary',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(212,'Thursday','Primary 2 A','English Language',267,'Primary',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0578','2025-12-31 18:32:15','2025-12-31 18:32:15'),(213,'Friday','Primary 5 A','Mathematics',266,'Primary',NULL,'08:15','08:55','Active','SCH/20','BRCH00001','CLS0584','2025-12-31 18:32:15','2025-12-31 18:32:15'),(214,'Friday','Primary 4 A','Mathematics',272,'Primary',NULL,'08:55','09:35','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(215,'Friday','Primary 3 A','Mathematics',264,'Primary',NULL,'09:50','10:30','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(216,'Friday','Primary 4 A','Quantitative Reasoning',272,'Primary',NULL,'10:30','11:10','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(217,'Friday','Primary 3 A','National Value',264,'Primary',NULL,'11:40','12:20','Active','SCH/20','BRCH00001','CLS0580','2025-12-31 18:32:15','2025-12-31 18:32:15'),(218,'Friday','Primary 4 A','English Language',272,'Primary',NULL,'12:20','13:00','Active','SCH/20','BRCH00001','CLS0582','2025-12-31 18:32:15','2025-12-31 18:32:15'),(219,'Friday','Primary 1 A','Verbal Reasoning',270,'Primary',NULL,'13:30','14:10','Active','SCH/20','BRCH00001','CLS0576','2025-12-31 18:32:15','2025-12-31 18:32:15');
/*!40000 ALTER TABLE `lesson_time_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lesson_time_table_backup`
--

DROP TABLE IF EXISTS `lesson_time_table_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lesson_time_table_backup` (
  `id` int(11) NOT NULL DEFAULT 0,
  `day` varchar(20) NOT NULL,
  `class_name` varchar(50) NOT NULL,
  `subject` varchar(50) NOT NULL,
  `teacher_id` int(10) NOT NULL,
  `section` varchar(50) NOT NULL,
  `school_location` varchar(150) DEFAULT NULL,
  `start_time` varchar(20) NOT NULL,
  `end_time` varchar(20) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) NOT NULL,
  `class_code` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lesson_time_table_backup`
--

LOCK TABLES `lesson_time_table_backup` WRITE;
/*!40000 ALTER TABLE `lesson_time_table_backup` DISABLE KEYS */;
INSERT INTO `lesson_time_table_backup` VALUES (4,'Monday','Nursery 1','English Language',2,'','BRCH00001','8:00: AM','8:45: AM','Active','SCH/1','BRCH00001','CLS0001','2025-09-23 13:16:29','2025-09-23 13:16:29'),(5,'Monday','Nursery 1','DRAWING',11,'Nursery','BRCH00003','7:30 PM','1:40 PM','Active','SCH/12','BRCH00003','CLS0239','2025-09-29 15:17:25','2025-09-29 15:17:25'),(6,'Monday','SS1 A','English Language',137,'SS','BRCH00027','08:00','08:45','Active','SCH/20','BRCH00027','CLS0560','2025-11-17 11:22:04','2025-11-17 11:22:04');
/*!40000 ALTER TABLE `lesson_time_table_backup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lessons`
--

DROP TABLE IF EXISTS `lessons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lessons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `class_name` varchar(255) DEFAULT NULL,
  `class_code` varchar(30) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `lesson_date` date DEFAULT NULL,
  `attachment` varchar(255) DEFAULT NULL,
  `content` mediumtext DEFAULT NULL,
  `materials` text DEFAULT NULL,
  `objectives` text DEFAULT NULL,
  `teacher` varchar(100) DEFAULT NULL,
  `teacher_id` varchar(15) NOT NULL,
  `title` varchar(259) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) NOT NULL,
  `academic_year` varchar(9) NOT NULL,
  `term` varchar(50) NOT NULL,
  `duration` int(11) NOT NULL,
  `status` enum('Draft','Published','Completed') NOT NULL DEFAULT 'Draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`,`created_at`),
  KEY `school_id` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lessons`
--

LOCK TABLES `lessons` WRITE;
/*!40000 ALTER TABLE `lessons` DISABLE KEYS */;
/*!40000 ALTER TABLE `lessons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_conditional_access`
--

DROP TABLE IF EXISTS `rbac_conditional_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_conditional_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_item_id` int(11) NOT NULL,
  `user_type` varchar(50) NOT NULL,
  `condition_type` enum('branch','class','department') NOT NULL,
  `condition_value` varchar(100) NOT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_menu_condition` (`menu_item_id`,`condition_type`),
  KEY `idx_school` (`school_id`),
  CONSTRAINT `rbac_conditional_access_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `rbac_menu_items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_conditional_access`
--

LOCK TABLES `rbac_conditional_access` WRITE;
/*!40000 ALTER TABLE `rbac_conditional_access` DISABLE KEYS */;
INSERT INTO `rbac_conditional_access` VALUES (1,1,'teacher','branch','MAIN','SCH/10',1,'2025-12-28 11:28:51');
/*!40000 ALTER TABLE `rbac_conditional_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_menu_access`
--

DROP TABLE IF EXISTS `rbac_menu_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_menu_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_item_id` int(11) NOT NULL,
  `user_type` varchar(50) NOT NULL,
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_menu_access` (`menu_item_id`,`user_type`),
  KEY `idx_menu_access_usertype` (`user_type`),
  KEY `idx_validity` (`valid_from`,`valid_until`),
  KEY `idx_school` (`school_id`),
  CONSTRAINT `rbac_menu_access_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `rbac_menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=666 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_menu_access`
--

LOCK TABLES `rbac_menu_access` WRITE;
/*!40000 ALTER TABLE `rbac_menu_access` DISABLE KEYS */;
INSERT INTO `rbac_menu_access` VALUES (110,6,'admin',NULL,NULL,NULL),(111,6,'branchadmin',NULL,NULL,NULL),(112,7,'admin',NULL,NULL,NULL),(113,7,'branchadmin',NULL,NULL,NULL),(114,8,'admin',NULL,NULL,NULL),(115,8,'branchadmin',NULL,NULL,NULL),(118,10,'admin',NULL,NULL,NULL),(119,10,'branchadmin',NULL,NULL,NULL),(120,11,'admin',NULL,NULL,NULL),(121,11,'branchadmin',NULL,NULL,NULL),(122,11,'teacher',NULL,NULL,NULL),(123,12,'admin',NULL,NULL,NULL),(124,12,'branchadmin',NULL,NULL,NULL),(125,13,'admin',NULL,NULL,NULL),(126,13,'branchadmin',NULL,NULL,NULL),(127,13,'teacher',NULL,NULL,NULL),(128,14,'admin',NULL,NULL,NULL),(129,14,'branchadmin',NULL,NULL,NULL),(130,15,'admin',NULL,NULL,NULL),(131,15,'branchadmin',NULL,NULL,NULL),(144,20,'admin',NULL,NULL,NULL),(145,20,'branchadmin',NULL,NULL,NULL),(146,20,'teacher',NULL,NULL,NULL),(147,21,'admin',NULL,NULL,NULL),(148,21,'branchadmin',NULL,NULL,NULL),(149,21,'teacher',NULL,NULL,NULL),(150,22,'admin',NULL,NULL,NULL),(151,22,'branchadmin',NULL,NULL,NULL),(152,22,'teacher',NULL,NULL,NULL),(153,23,'teacher',NULL,NULL,NULL),(154,24,'teacher',NULL,NULL,NULL),(155,25,'teacher',NULL,NULL,NULL),(156,26,'admin',NULL,NULL,NULL),(157,26,'branchadmin',NULL,NULL,NULL),(168,31,'parent',NULL,NULL,NULL),(170,33,'student',NULL,NULL,NULL),(171,34,'student',NULL,NULL,NULL),(172,35,'student',NULL,NULL,NULL),(173,36,'student',NULL,NULL,NULL),(185,42,'admin',NULL,NULL,NULL),(186,43,'admin',NULL,NULL,NULL),(187,43,'branchadmin',NULL,NULL,NULL),(198,49,'admin',NULL,NULL,NULL),(229,63,'superadmin',NULL,NULL,NULL),(231,64,'superadmin',NULL,NULL,NULL),(232,65,'superadmin',NULL,NULL,NULL),(233,66,'superadmin',NULL,NULL,NULL),(234,67,'superadmin',NULL,NULL,NULL),(237,70,'admin',NULL,NULL,NULL),(238,70,'branchadmin',NULL,NULL,NULL),(239,71,'admin',NULL,NULL,NULL),(240,71,'branchadmin',NULL,NULL,NULL),(241,72,'admin',NULL,NULL,NULL),(242,72,'branchadmin',NULL,NULL,NULL),(243,73,'admin',NULL,NULL,NULL),(244,73,'branchadmin',NULL,NULL,NULL),(245,74,'admin',NULL,NULL,NULL),(246,74,'branchadmin',NULL,NULL,NULL),(247,75,'admin',NULL,NULL,NULL),(248,75,'branchadmin',NULL,NULL,NULL),(249,76,'admin',NULL,NULL,NULL),(250,76,'branchadmin',NULL,NULL,NULL),(251,77,'admin',NULL,NULL,NULL),(252,77,'branchadmin',NULL,NULL,NULL),(253,78,'admin',NULL,NULL,NULL),(254,78,'branchadmin',NULL,NULL,NULL),(255,79,'admin',NULL,NULL,NULL),(256,79,'branchadmin',NULL,NULL,NULL),(257,80,'admin',NULL,NULL,NULL),(258,80,'branchadmin',NULL,NULL,NULL),(259,81,'admin',NULL,NULL,NULL),(260,81,'branchadmin',NULL,NULL,NULL),(261,82,'admin',NULL,NULL,NULL),(262,82,'branchadmin',NULL,NULL,NULL),(263,83,'admin',NULL,NULL,NULL),(264,83,'branchadmin',NULL,NULL,NULL),(265,84,'admin',NULL,NULL,NULL),(266,84,'branchadmin',NULL,NULL,NULL),(267,85,'admin',NULL,NULL,NULL),(268,85,'branchadmin',NULL,NULL,NULL),(269,86,'admin',NULL,NULL,NULL),(270,86,'branchadmin',NULL,NULL,NULL),(271,87,'admin',NULL,NULL,NULL),(272,87,'branchadmin',NULL,NULL,NULL),(273,88,'admin',NULL,NULL,NULL),(274,88,'branchadmin',NULL,NULL,NULL),(275,89,'admin',NULL,NULL,NULL),(276,89,'branchadmin',NULL,NULL,NULL),(277,90,'admin',NULL,NULL,NULL),(278,90,'branchadmin',NULL,NULL,NULL),(279,91,'admin',NULL,NULL,NULL),(280,91,'branchadmin',NULL,NULL,NULL),(281,92,'admin',NULL,NULL,NULL),(282,92,'branchadmin',NULL,NULL,NULL),(283,93,'admin',NULL,NULL,NULL),(284,93,'branchadmin',NULL,NULL,NULL),(285,94,'admin',NULL,NULL,NULL),(286,94,'branchadmin',NULL,NULL,NULL),(287,95,'admin',NULL,NULL,NULL),(288,95,'branchadmin',NULL,NULL,NULL),(289,96,'admin',NULL,NULL,NULL),(290,96,'branchadmin',NULL,NULL,NULL),(291,97,'admin',NULL,NULL,NULL),(292,97,'branchadmin',NULL,NULL,NULL),(293,98,'admin',NULL,NULL,NULL),(294,98,'branchadmin',NULL,NULL,NULL),(295,99,'admin',NULL,NULL,NULL),(296,99,'branchadmin',NULL,NULL,NULL),(297,100,'admin',NULL,NULL,NULL),(298,100,'branchadmin',NULL,NULL,NULL),(299,101,'admin',NULL,NULL,NULL),(300,101,'branchadmin',NULL,NULL,NULL),(301,102,'admin',NULL,NULL,NULL),(302,102,'branchadmin',NULL,NULL,NULL),(303,103,'admin',NULL,NULL,NULL),(304,103,'branchadmin',NULL,NULL,NULL),(305,104,'admin',NULL,NULL,NULL),(306,104,'branchadmin',NULL,NULL,NULL),(307,105,'admin',NULL,NULL,NULL),(308,105,'branchadmin',NULL,NULL,NULL),(414,63,'developer',NULL,NULL,NULL),(415,64,'developer',NULL,NULL,NULL),(416,65,'developer',NULL,NULL,NULL),(417,66,'developer',NULL,NULL,NULL),(418,67,'developer',NULL,NULL,NULL),(419,68,'developer',NULL,NULL,NULL),(420,69,'developer',NULL,NULL,NULL),(429,16,'teacher',NULL,NULL,NULL),(430,17,'teacher',NULL,NULL,NULL),(464,3,'admin',NULL,NULL,NULL),(465,1,'admin',NULL,NULL,NULL),(466,50,'admin',NULL,NULL,NULL),(467,37,'admin',NULL,NULL,NULL),(470,1,'branchadmin',NULL,NULL,NULL),(471,37,'branchadmin',NULL,NULL,NULL),(472,3,'branchadmin',NULL,NULL,NULL),(473,50,'branchadmin',NULL,NULL,NULL),(476,1,'exam_officer',NULL,NULL,NULL),(477,50,'teacher',NULL,NULL,NULL),(479,3,'exam_officer',NULL,NULL,NULL),(480,37,'superadmin',NULL,NULL,NULL),(482,37,'exam_officer',NULL,NULL,NULL),(484,50,'exam_officer',NULL,NULL,NULL),(486,39,'admin',NULL,NULL,NULL),(487,39,'branchadmin',NULL,NULL,NULL),(488,38,'admin',NULL,NULL,NULL),(489,51,'admin',NULL,NULL,NULL),(490,39,'exam_officer',NULL,NULL,NULL),(491,38,'branchadmin',NULL,NULL,NULL),(492,51,'branchadmin',NULL,NULL,NULL),(494,29,'admin',NULL,NULL,NULL),(495,51,'teacher',NULL,NULL,NULL),(496,38,'exam_officer',NULL,NULL,NULL),(497,29,'branchadmin',NULL,NULL,NULL),(500,51,'exam_officer',NULL,NULL,NULL),(501,29,'parent',NULL,NULL,NULL),(505,29,'teacher',NULL,NULL,NULL),(506,52,'admin',NULL,NULL,NULL),(507,29,'exam_officer',NULL,NULL,NULL),(508,52,'branchadmin',NULL,NULL,NULL),(509,2,'admin',NULL,NULL,NULL),(510,52,'teacher',NULL,NULL,NULL),(511,2,'branchadmin',NULL,NULL,NULL),(512,54,'admin',NULL,NULL,NULL),(513,55,'admin',NULL,NULL,NULL),(514,54,'branchadmin',NULL,NULL,NULL),(515,2,'exam_officer',NULL,NULL,NULL),(516,55,'branchadmin',NULL,NULL,NULL),(517,53,'admin',NULL,NULL,NULL),(518,52,'exam_officer',NULL,NULL,NULL),(519,54,'exam_officer',NULL,NULL,NULL),(520,9,'admin',NULL,NULL,NULL),(521,53,'branchadmin',NULL,NULL,NULL),(522,55,'teacher',NULL,NULL,NULL),(523,55,'exam_officer',NULL,NULL,NULL),(524,9,'branchadmin',NULL,NULL,NULL),(525,53,'teacher',NULL,NULL,NULL),(526,57,'admin',NULL,NULL,NULL),(527,53,'exam_officer',NULL,NULL,NULL),(528,9,'exam_officer',NULL,NULL,NULL),(529,58,'admin',NULL,NULL,NULL),(530,45,'admin',NULL,NULL,NULL),(531,57,'branchadmin',NULL,NULL,NULL),(532,45,'branchadmin',NULL,NULL,NULL),(533,58,'branchadmin',NULL,NULL,NULL),(534,56,'admin',NULL,NULL,NULL),(535,57,'exam_officer',NULL,NULL,NULL),(536,58,'exam_officer',NULL,NULL,NULL),(537,45,'exam_officer',NULL,NULL,NULL),(538,56,'branchadmin',NULL,NULL,NULL),(539,44,'admin',NULL,NULL,NULL),(540,59,'teacher',NULL,NULL,NULL),(541,56,'exam_officer',NULL,NULL,NULL),(542,44,'branchadmin',NULL,NULL,NULL),(543,59,'exam_officer',NULL,NULL,NULL),(544,47,'admin',NULL,NULL,NULL),(545,60,'admin',NULL,NULL,NULL),(546,44,'exam_officer',NULL,NULL,NULL),(547,60,'branchadmin',NULL,NULL,NULL),(548,48,'admin',NULL,NULL,NULL),(549,47,'branchadmin',NULL,NULL,NULL),(550,60,'exam_officer',NULL,NULL,NULL),(551,46,'admin',NULL,NULL,NULL),(552,62,'admin',NULL,NULL,NULL),(553,46,'branchadmin',NULL,NULL,NULL),(554,62,'branchadmin',NULL,NULL,NULL),(555,48,'branchadmin',NULL,NULL,NULL),(556,47,'exam_officer',NULL,NULL,NULL),(557,46,'exam_officer',NULL,NULL,NULL),(558,62,'exam_officer',NULL,NULL,NULL),(559,61,'admin',NULL,NULL,NULL),(560,48,'exam_officer',NULL,NULL,NULL),(561,61,'branchadmin',NULL,NULL,NULL),(562,61,'exam_officer',NULL,NULL,NULL),(563,106,'admin',NULL,NULL,NULL),(564,106,'branchadmin',NULL,NULL,NULL),(565,106,'hr',NULL,NULL,NULL),(568,53,'form_master',NULL,NULL,NULL),(569,13,'form_master',NULL,NULL,NULL),(570,107,'admin',NULL,NULL,NULL),(571,107,'branchadmin',NULL,NULL,NULL),(576,108,'admin',NULL,NULL,NULL),(577,108,'branchadmin',NULL,NULL,NULL),(580,109,'admin',NULL,NULL,NULL),(581,109,'branchadmin',NULL,NULL,NULL),(582,110,'branchadmin',NULL,NULL,NULL),(583,110,'admin',NULL,NULL,NULL),(584,18,'admin',NULL,NULL,NULL),(585,18,'branchadmin',NULL,NULL,NULL),(586,18,'teacher',NULL,NULL,NULL),(587,19,'admin',NULL,NULL,NULL),(588,19,'branchadmin',NULL,NULL,NULL),(589,19,'teacher',NULL,NULL,NULL),(594,27,'admin',NULL,NULL,NULL),(595,27,'branchadmin',NULL,NULL,NULL),(596,27,'exam_officer',NULL,NULL,NULL),(597,27,'teacher',NULL,NULL,NULL),(598,30,'parent',NULL,NULL,NULL),(599,32,'student',NULL,NULL,NULL),(600,111,'admin',NULL,NULL,NULL),(601,112,'admin',NULL,NULL,NULL),(602,113,'admin',NULL,NULL,NULL),(603,114,'admin',NULL,NULL,NULL),(604,115,'admin',NULL,NULL,NULL),(606,117,'teacher',NULL,NULL,NULL),(607,118,'teacher',NULL,NULL,NULL),(608,119,'teacher',NULL,NULL,NULL),(609,120,'teacher',NULL,NULL,NULL),(621,121,'admin',NULL,NULL,NULL),(622,122,'admin',NULL,NULL,NULL),(628,121,'branchadmin',NULL,NULL,NULL),(629,122,'branchadmin',NULL,NULL,NULL),(636,129,'admin',NULL,NULL,NULL),(637,117,'admin',NULL,NULL,NULL),(638,118,'admin',NULL,NULL,NULL),(639,119,'admin',NULL,NULL,NULL),(640,120,'admin',NULL,NULL,NULL),(644,117,'branchadmin',NULL,NULL,NULL),(645,118,'branchadmin',NULL,NULL,NULL),(646,119,'branchadmin',NULL,NULL,NULL),(647,120,'branchadmin',NULL,NULL,NULL),(651,16,'admin',NULL,NULL,NULL),(652,16,'branchadmin',NULL,NULL,NULL),(653,17,'admin',NULL,NULL,NULL),(654,17,'branchadmin',NULL,NULL,NULL),(655,1068,'admin',NULL,NULL,NULL),(656,1068,'branchadmin',NULL,NULL,NULL),(657,1069,'developer',NULL,NULL,NULL),(658,1070,'teacher',NULL,NULL,NULL),(660,5,'admin',NULL,NULL,NULL),(661,5,'branchadmin',NULL,NULL,NULL),(662,4,'admin',NULL,NULL,NULL),(663,4,'branchadmin',NULL,NULL,NULL),(664,4,'exam_officer',NULL,NULL,NULL),(665,1071,'Admin',NULL,NULL,NULL);
/*!40000 ALTER TABLE `rbac_menu_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_menu_items`
--

DROP TABLE IF EXISTS `rbac_menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_menu_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_id` int(11) DEFAULT NULL,
  `label` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `required_access` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`required_access`)),
  `required_permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`required_permissions`)),
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `feature` varchar(50) DEFAULT NULL,
  `premium` tinyint(1) DEFAULT 0,
  `elite` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `rbac_menu_items_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `rbac_menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1072 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_menu_items`
--

LOCK TABLES `rbac_menu_items` WRITE;
/*!40000 ALTER TABLE `rbac_menu_items` DISABLE KEYS */;
INSERT INTO `rbac_menu_items` VALUES (1,NULL,'Personal Data Mngr','ti ti-users','',NULL,NULL,1,1,'core',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(2,1,'Students List','ti ti-school',NULL,NULL,NULL,1,1,'core',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(3,2,'Student List','ti ti-list','/student/student-list',NULL,NULL,1,1,'core',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(4,2,'Class List','ti ti-list','/academic/class-list',NULL,NULL,2,1,'core',0,0,'2025-12-25 19:23:23','2026-01-02 22:34:56'),(5,2,'Promotion & Graduation','fa fa-table','/students/promotion',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2026-01-02 22:34:41'),(6,1,'Admission','ti ti-user-plus',NULL,NULL,NULL,2,1,'admission',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(7,6,'Dashboard','ti ti-dashboard','/admissions/dashboard',NULL,NULL,1,1,'admission',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(8,6,'Applications','ti ti-file-text','/admissions/applications',NULL,NULL,2,1,'admission',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(9,107,'Parent List','ti ti-user-bolt','/parents/parent-list',NULL,NULL,3,1,'core',0,0,'2025-12-25 19:23:23','2025-12-28 14:40:24'),(10,109,'Staff List','ti ti-users','/teacher/teacher-list',NULL,NULL,4,1,'core',0,0,'2025-12-25 19:23:23','2025-12-28 14:51:07'),(11,1,'Student Attendance','ti ti-calendar-check',NULL,NULL,NULL,5,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(12,11,'Reports 📊','ti ti-chart-bar','/attendance/dashboard',NULL,NULL,1,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(13,11,'Mark Attendance','ti ti-school','/academic/attendance-register',NULL,NULL,2,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(14,106,'Mark Attendance','ti ti-id-badge','/hrm/staff-attendance',NULL,NULL,3,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(15,106,'Reports 📊','ti ti-users','/hrm/staff-attendance-overview',NULL,NULL,4,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(16,NULL,'Class Management',NULL,NULL,NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(17,16,'Daily Routine','fa fa-gears',NULL,NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(18,17,'Class Time Table','ti ti-table','/academic/class-time-table',NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(19,17,'Class Attendance','ti ti-id-badge','/academic/attendance-register',NULL,NULL,2,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(20,17,'Lessons','ti ti-book','/academic/tearcher-lessons',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(21,1070,'Syllabus & Curriculum','ti ti-clipboard-list','/academic/syllabus',NULL,NULL,4,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-29 13:13:59'),(22,17,'Assignments','ti ti-license','/academic/class-assignment',NULL,NULL,5,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(23,16,'Teaching Tools','fa fa-gears',NULL,NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(24,23,'Virtual Class','ti ti-receipt','/application/video-call',NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(25,23,'Lesson Planning','ti ti-book','/academic/teacher/lesson-planning',NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(26,23,'Syllabus','ti ti-dashboard','/class/syllabus',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(27,129,'Announcements','ti ti-clock','',NULL,NULL,3,1,'communication',0,0,'2025-12-25 19:23:23','2025-12-28 23:24:37'),(29,27,'Notice Board','ti ti-receipt','/announcements/notice-board',NULL,NULL,0,1,'communication',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(30,NULL,'My Children','ti ti-users','',NULL,NULL,4,1,'parent',0,0,'2025-12-25 19:23:23','2025-12-28 14:56:31'),(31,30,'Bills / School Fees','ti ti-receipt','/parent/studentpayment',NULL,NULL,1,1,'parent',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(32,NULL,'My School Activities','ti ti-clock','',NULL,NULL,5,1,'student',0,0,'2025-12-25 19:23:23','2025-12-28 14:57:22'),(33,32,'My Attendances','ti ti-id-badge','/academic/student-attendance',NULL,NULL,1,1,'attendance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(34,32,'Class Time Table','ti ti-table','/academic/student-time-table',NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(35,32,'Lessons','ti ti-book','/academic/lessons',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(36,32,'My Assignments','ti ti-license','/academic/student-assignments',NULL,NULL,4,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(37,NULL,'General Setups',NULL,NULL,NULL,NULL,6,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(38,37,'School Setup','fa fa-gears',NULL,NULL,NULL,1,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(39,38,'Academic Calendar','ti ti-calendar','/school-setup/academic-year-setup',NULL,NULL,1,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(42,38,'School Branches','ti ti-building','/school-setup/branches',NULL,NULL,4,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(43,38,'School Sections','ti ti-section','/school-setup/section-form',NULL,NULL,5,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(44,38,'Classes Setup','ti ti-classes','/academic/classes-setup',NULL,NULL,6,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(45,38,'Subjects Setup','ti ti-book','/academic/subjects',NULL,NULL,7,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(46,38,'Personal Dev. Setup','ti ti-book','/academic/character-subjects',NULL,NULL,8,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(47,38,'Assessment Setup','ti ti-book','/academic/ca-setup',NULL,NULL,9,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(48,38,'Time Table','ti ti-table','/simple-timetable',NULL,NULL,10,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(49,38,'Communication Setup','ti ti-message-circle','/communication/setup',NULL,NULL,11,1,'setup',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(50,NULL,'Exams & Records',NULL,NULL,NULL,NULL,7,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(51,50,'Examinations','ti ti-certificate',NULL,NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(52,51,'Assessment Form','fa fa-clipboard-list','/academic/assessments',NULL,NULL,1,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(53,51,'FormMaster Review','fa fa-clipboard-list','/academic/formmaster-score-sheet',NULL,NULL,2,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(54,51,'Reports Generator','fa fa-file-alt','/academic/reports/Exam',NULL,NULL,3,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(55,51,'Broad Sheet','fa fa-table','/academic/broad-sheet',NULL,NULL,4,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(56,51,'Exam Analytics','fa fa-chart-bar','/academic/exam-analytics',NULL,NULL,5,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(57,51,'Report Template','fa fa-cog','/academic/report-configuration',NULL,NULL,6,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(58,51,'CA/Exam Setup','fa fa-cogs','/examinations/ca-setup',NULL,NULL,7,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(59,51,'Submit Questions','fa fa-upload','/examinations/submit-questions',NULL,NULL,8,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(60,51,'Moderation','fa fa-check-circle','/examinations/moderation',NULL,NULL,9,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(61,51,'Print Questions','fa fa-print','/examinations/print-questions',NULL,NULL,10,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(62,51,'Progress Tracking','fa fa-tasks','/examinations/progress',NULL,NULL,11,1,'academic',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(63,NULL,'Super Admin',NULL,NULL,NULL,NULL,8,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(64,63,'Create School',NULL,'/school-setup/add-school',NULL,NULL,1,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(65,63,'School List',NULL,'/school-setup/school-list',NULL,NULL,2,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(66,63,'Support Dashboard',NULL,'/support/superadmin-dashboard',NULL,NULL,3,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(67,63,'Queue Dashboard','ti ti-list-check','/superadmin/queues',NULL,NULL,4,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(68,63,'School Access Management',NULL,'/school-access-management',NULL,NULL,5,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(69,63,'App Configurations',NULL,'/app/configurations',NULL,NULL,6,1,'admin',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(70,NULL,'Express Finance',NULL,NULL,NULL,NULL,9,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(71,70,'Finance Report','ti ti-chart-bar','/management/finance/report',NULL,NULL,1,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(72,70,'Bank Accounts','ti ti-building-bank','/management/finance/bank-accounts',NULL,NULL,2,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(73,70,'School Fees','ti ti-coin',NULL,NULL,NULL,3,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(74,73,'Fees Setup','ti ti-settings','/management/student-fees',NULL,NULL,1,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(75,73,'Single Billing','ti ti-receipt','/management/collect-fees',NULL,NULL,2,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(76,73,'Single Payments','ti ti-cash','/management/receipt-classes',NULL,NULL,3,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(77,73,'Family Billing','ti ti-users','/management/family-billing',NULL,NULL,4,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(78,73,'Family Payments','ti ti-wallet','/parent/parentpayments',NULL,NULL,5,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(79,70,'Income & Expenses','ti ti-coin',NULL,NULL,NULL,4,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(80,79,'Income Reports','ti ti-arrow-up','/accounts/income-report',NULL,NULL,1,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(81,79,'Expenses Reports','ti ti-arrow-down','/accounts/expesnes/new',NULL,NULL,2,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(82,79,'Profit and Loss','ti ti-chart-dots','/accounts/profit/report',NULL,NULL,3,1,'finance',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(83,70,'Payroll','ti ti-briefcase',NULL,NULL,NULL,5,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(84,83,'Staff Management','ti ti-users-group','/payroll/staff-payroll',NULL,NULL,1,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 10:05:52'),(85,83,'Salary Structure','ti ti-list-tree','/payroll/structure',NULL,NULL,2,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(86,83,'Allowance & Deductions','ti ti-percentage','/payrol/Allowances/deductions',NULL,NULL,3,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(87,83,'Loan Management','ti ti-credit-card','/payroll/loan-management',NULL,NULL,4,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(88,83,'Salary Disbursement','ti ti-transfer','/payroll/salary-disbursement',NULL,NULL,5,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(89,83,'Salary Report','ti ti-report','/payroll/salary-report',NULL,NULL,6,1,'hr',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(90,NULL,'Supply Management',NULL,NULL,NULL,NULL,10,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(91,90,'Asset Management','ti ti-package',NULL,NULL,NULL,1,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(92,91,'Asset Dashboard','ti ti-dashboard','/supply-management/asset/dashboard',NULL,NULL,1,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(93,91,'Asset Inventory','ti ti-list','/supply-management/asset/inventory',NULL,NULL,2,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(94,91,'Asset Categories','ti ti-category','/supply-management/asset/categories',NULL,NULL,3,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(95,91,'Facility Rooms','ti ti-home','/supply-management/asset/facility-rooms',NULL,NULL,4,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(96,91,'Asset Inspections','ti ti-checklist','/supply-management/asset/inspections',NULL,NULL,5,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(97,91,'Maintenance Requests','ti ti-wrench','/supply-management/asset/maintenance-requests',NULL,NULL,6,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(98,91,'Asset Transfers','ti ti-transfer','/supply-management/asset/transfers',NULL,NULL,7,1,'assets',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(99,90,'Inventory Management','ti ti-shopping-cart',NULL,NULL,NULL,2,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(100,99,'Inventory Dashboard','ti ti-dashboard','/supply-management/inventory/dashboard',NULL,NULL,1,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(101,99,'Product Catalog','ti ti-list','/supply-management/inventory/products',NULL,NULL,2,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(102,99,'Stock Management','ti ti-stack','/supply-management/inventory/stock',NULL,NULL,3,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(103,99,'Purchase Orders','ti ti-file-invoice','/supply-management/inventory/purchase-orders',NULL,NULL,4,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(104,99,'Sales Transactions','ti ti-shopping-cart','/supply-management/inventory/sales',NULL,NULL,5,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(105,99,'Suppliers','ti ti-truck','/supply-management/inventory/suppliers',NULL,NULL,6,1,'inventory',0,0,'2025-12-25 19:23:23','2025-12-27 12:31:27'),(106,1,'Staff Attendance','ti ti-id-badge',NULL,NULL,NULL,12,1,'hr',0,0,'2025-12-25 21:58:07','2025-12-27 10:05:52'),(107,1,'Parents','ti ti-users',NULL,NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:38:48','2025-12-28 14:38:48'),(108,107,'Add Parent','ti ti-user-plus','/parents/parent-list?action=add',NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:46:21','2025-12-28 14:50:00'),(109,1,'Staff ','ti ti-users','',NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:50:50','2025-12-28 14:51:18'),(110,109,'Add Staff ','ti ti-user-plus','/teacher/add-teacher',NULL,NULL,0,1,NULL,0,0,'2025-12-28 14:54:05','2025-12-28 14:54:05'),(111,129,'Communications','ti ti-message-circle',NULL,NULL,NULL,25,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 23:24:37'),(112,111,'Dashboard','ti ti-dashboard','/communications/dashboard',NULL,NULL,1,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 21:05:57'),(113,111,'Sent Messages','ti ti-send','/communications/sent-messages',NULL,NULL,2,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 21:05:57'),(114,111,'Configuration','ti ti-settings','/communication/setup',NULL,NULL,3,1,'communication',0,0,'2025-12-28 21:05:57','2025-12-28 21:05:57'),(115,27,'System Notifications','ti ti-bell','/system/notifications',NULL,NULL,2,1,'communication',0,0,'2025-12-28 21:12:42','2025-12-28 21:12:42'),(117,17,'My Teaching Hub','ti ti-dashboard','/academic/teacher-syllabus-hub',NULL,NULL,25,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-28 23:12:53'),(118,1070,'Create Lesson Plan','ti ti-plus','/academic/lesson-plan-creator',NULL,NULL,26,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-31 21:40:09'),(119,1070,'Browse Curriculum','ti ti-search','/academic/curriculum-browser',NULL,NULL,27,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-29 13:14:26'),(120,17,'Generate Assessment','ti ti-clipboard-check','/academic/assessment-generator',NULL,NULL,28,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-28 23:12:53'),(121,1070,'Subject Mapping','ti ti-link','/academic/subject-mapping',NULL,NULL,29,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-29 13:14:16'),(122,38,'Subject Mapping','ti ti-link','/academic/subject-mapping',NULL,NULL,150,1,NULL,0,0,'2025-12-28 23:12:53','2025-12-28 23:12:53'),(129,NULL,'Messaging','ti ti-messages',NULL,NULL,NULL,26,1,'communication',0,0,'2025-12-28 23:24:37','2025-12-28 23:25:40'),(1068,1070,'Syllabus Dashboard','ti ti-clipboard-list','/developer/syllabus-dashboard',NULL,NULL,30,1,NULL,0,0,'2025-12-29 00:35:07','2025-12-29 13:14:20'),(1069,63,'Syllabus Scraping Dashboard','ti ti-robot','/developer/syllabus-scraping-dashboard',NULL,NULL,160,1,NULL,0,0,'2025-12-29 00:35:07','2025-12-29 00:35:07'),(1070,16,'Syllabus','ti ti-book',NULL,NULL,NULL,0,1,NULL,0,0,'2025-12-29 13:13:27','2025-12-29 13:13:27'),(1071,2,'ID Card Generator','ti ti-id-badge','/student/id-card-generator',NULL,NULL,40,1,NULL,0,0,'2026-01-02 22:31:46','2026-01-02 22:31:46');
/*!40000 ALTER TABLE `rbac_menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_menu_packages`
--

DROP TABLE IF EXISTS `rbac_menu_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_menu_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_item_id` int(11) NOT NULL,
  `package_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_menu_package` (`menu_item_id`,`package_id`),
  KEY `idx_menu_packages_pkgid` (`package_id`),
  CONSTRAINT `rbac_menu_packages_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `rbac_menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=171 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_menu_packages`
--

LOCK TABLES `rbac_menu_packages` WRITE;
/*!40000 ALTER TABLE `rbac_menu_packages` DISABLE KEYS */;
INSERT INTO `rbac_menu_packages` VALUES (95,1,4),(93,2,4),(94,3,4),(169,4,3),(168,5,3),(68,6,2),(69,7,2),(70,8,2),(16,9,3),(96,10,4),(78,11,3),(79,12,3),(80,13,3),(76,14,2),(77,15,2),(159,16,3),(160,17,3),(104,18,3),(105,19,3),(153,20,3),(154,21,3),(155,22,3),(156,23,3),(157,24,3),(158,25,3),(87,26,2),(107,27,3),(92,29,3),(108,30,3),(109,32,3),(91,35,2),(20,39,3),(23,42,3),(24,43,3),(25,46,3),(26,47,3),(27,48,3),(28,49,3),(60,50,3),(61,51,3),(62,52,3),(63,53,3),(64,54,3),(65,55,3),(7,56,2),(66,57,3),(67,58,3),(3,59,1),(161,59,3),(4,60,1),(5,61,1),(6,62,1),(29,71,3),(30,76,3),(31,77,3),(32,78,3),(33,79,3),(34,80,3),(35,81,3),(36,82,3),(8,83,2),(9,84,2),(10,85,2),(11,86,2),(12,87,2),(13,88,2),(14,89,2),(44,90,1),(45,91,1),(46,92,1),(47,93,1),(48,94,1),(49,95,1),(50,96,1),(51,97,1),(52,98,1),(53,99,1),(54,100,1),(55,101,1),(56,102,1),(57,103,1),(58,104,1),(59,105,1),(75,106,2),(97,107,3),(100,108,3),(102,109,4),(103,110,4),(113,111,2),(114,111,3),(115,112,2),(116,112,3),(117,113,2),(118,113,3),(119,114,2),(120,114,3),(162,117,3),(163,118,3),(164,119,3),(165,120,3),(140,121,2),(141,122,2),(147,129,2),(148,129,3),(151,1068,2),(166,1070,3),(170,1071,2);
/*!40000 ALTER TABLE `rbac_menu_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_permission_templates`
--

DROP TABLE IF EXISTS `rbac_permission_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_permission_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `menu_items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`menu_items`)),
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_permission_templates`
--

LOCK TABLES `rbac_permission_templates` WRITE;
/*!40000 ALTER TABLE `rbac_permission_templates` DISABLE KEYS */;
INSERT INTO `rbac_permission_templates` VALUES (1,'Basic Teacher','Core teaching features only','[\"classes\", \"subjects\", \"attendance\", \"assessments\"]',NULL,'2025-12-27 12:56:47'),(2,'Full Admin','All administrative features','[\"dashboard\", \"students\", \"staff\", \"classes\", \"finance\", \"reports\", \"settings\"]',NULL,'2025-12-27 12:56:47'),(3,'Finance Only','Financial management access','[\"payments\", \"fees\", \"invoices\", \"financial-reports\"]',NULL,'2025-12-27 12:56:47'),(4,'Exam Officer','Examination management','[\"cbt\", \"exam-setup\", \"results\", \"report-cards\"]',NULL,'2025-12-27 12:56:47');
/*!40000 ALTER TABLE `rbac_permission_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_school_packages`
--

DROP TABLE IF EXISTS `rbac_school_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_school_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` varchar(50) NOT NULL,
  `package_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `features_override` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features_override`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `activated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_active_school` (`school_id`,`is_active`),
  KEY `idx_school_active` (`school_id`,`is_active`),
  KEY `idx_package` (`package_id`),
  KEY `rbac_school_packages_school_id_is_active` (`school_id`,`is_active`),
  KEY `rbac_school_packages_package_id` (`package_id`),
  KEY `idx_school_packages_school` (`school_id`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_school_packages`
--

LOCK TABLES `rbac_school_packages` WRITE;
/*!40000 ALTER TABLE `rbac_school_packages` DISABLE KEYS */;
INSERT INTO `rbac_school_packages` VALUES (1,'SCH/11',3,'2025-12-31','2026-12-31',NULL,1,1,NULL,'2025-12-24 13:08:52','2025-12-31 00:16:00',NULL),(2,'SCH/10',3,'2025-01-01','2025-12-31',NULL,1,735,NULL,'2025-12-24 16:02:04','2025-12-25 21:19:43',NULL),(3,'SCH/12',1,'0000-00-00',NULL,NULL,1,NULL,NULL,'2025-12-25 21:19:43','2025-12-25 21:19:43',NULL),(4,'SCH/1',3,'2025-01-01','2025-12-31',NULL,1,1,NULL,'2025-12-28 20:56:53','2025-12-28 20:56:53',NULL),(7,'SCH/20',1,'2026-01-01','2027-01-01',NULL,1,1064,NULL,'2025-12-31 13:40:53','2026-01-01 00:39:15','2026-01-01 00:39:15');
/*!40000 ALTER TABLE `rbac_school_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_usage_analytics`
--

DROP TABLE IF EXISTS `rbac_usage_analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_usage_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  `access_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_type` varchar(50) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_menu` (`user_id`,`menu_item_id`),
  KEY `idx_time` (`access_time`),
  KEY `idx_school` (`school_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_usage_analytics`
--

LOCK TABLES `rbac_usage_analytics` WRITE;
/*!40000 ALTER TABLE `rbac_usage_analytics` DISABLE KEYS */;
INSERT INTO `rbac_usage_analytics` VALUES (1,735,1,'SCH/10','2025-12-28 11:28:51','Admin','test-session-123');
/*!40000 ALTER TABLE `rbac_usage_analytics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rbac_user_menu_access`
--

DROP TABLE IF EXISTS `rbac_user_menu_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rbac_user_menu_access` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `menu_item_id` int(11) NOT NULL,
  `school_id` varchar(20) NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `granted_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_menu` (`user_id`,`menu_item_id`,`school_id`),
  KEY `idx_user_school` (`user_id`,`school_id`),
  KEY `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rbac_user_menu_access`
--

LOCK TABLES `rbac_user_menu_access` WRITE;
/*!40000 ALTER TABLE `rbac_user_menu_access` DISABLE KEYS */;
/*!40000 ALTER TABLE `rbac_user_menu_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `syllabus`
--

DROP TABLE IF EXISTS `syllabus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `syllabus` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject` varchar(100) NOT NULL,
  `global_subject_code` varchar(50) DEFAULT NULL,
  `class_code` varchar(30) NOT NULL,
  `global_level_code` varchar(10) DEFAULT NULL,
  `term` varchar(50) NOT NULL,
  `week` tinyint(2) DEFAULT NULL,
  `title` varchar(300) NOT NULL,
  `content` text NOT NULL,
  `status` enum('Pending','Ongoing','Onhold','Deleted') NOT NULL DEFAULT 'Pending',
  `created_by` varchar(50) DEFAULT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `scraped_source` varchar(100) DEFAULT NULL,
  `is_global_content` tinyint(1) DEFAULT 0,
  `scraped_at` timestamp NULL DEFAULT NULL,
  `objectives` text DEFAULT NULL,
  `activities` text DEFAULT NULL,
  `assessment` text DEFAULT NULL,
  `resources` text DEFAULT NULL,
  `source_url` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `syllabus`
--

LOCK TABLES `syllabus` WRITE;
/*!40000 ALTER TABLE `syllabus` DISABLE KEYS */;
INSERT INTO `syllabus` VALUES (1,'AGRIC SCIENCE',NULL,'JS0003',NULL,'First Term',1,'I NEED MONEY','<p>I NEED THE FIND TO MONEY</p>','Pending',NULL,NULL,NULL,'2025-06-30 15:09:56','2025-06-30 15:09:56',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(2,'AGRIC SCIENCE',NULL,'JS0003',NULL,'First Term',1,'I NEED MONEY','<p>I NEED THE FIND TO MONEY</p>','Pending',NULL,NULL,NULL,'2025-06-30 15:09:56','2025-06-30 15:09:56',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(3,'Mathematics',NULL,'CLS0007',NULL,'First Term',1,'Numbers 1-10','Introduction to counting and number recognition (2026-01-05 - 2026-01-11)','Pending','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(4,'Mathematics',NULL,'CLS0007',NULL,'First Term',2,'Addition Basics','Simple addition using objects and fingers (2026-01-12 - 2026-01-18)','Ongoing','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(5,'Mathematics',NULL,'CLS0007',NULL,'First Term',3,'Subtraction Basics','Simple subtraction using objects (2026-01-19 - 2026-01-25)','Pending','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(6,'English Language',NULL,'CLS0007',NULL,'First Term',1,'Alphabet A-E','Learning letters A to E with sounds (2026-01-05 - 2026-01-11)','Ongoing','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(7,'English Language',NULL,'CLS0007',NULL,'First Term',2,'Alphabet F-J','Learning letters F to J with sounds (2026-01-12 - 2026-01-18)','Pending','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(8,'Social Studies',NULL,'CLS0007',NULL,'First Term',1,'My Family','Understanding family members and relationships (2026-01-05 - 2026-01-11)','Pending','SCH/10',NULL,NULL,'2025-12-25 18:04:09','2025-12-25 18:14:21',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL),(9,'Basic Science',NULL,'Primary 1',NULL,'First Term',1,'Living Things I','Living things are things that are alive. They can move, eat, grow, and have babies (reproduce).','Pending',NULL,NULL,NULL,'2025-12-29 00:29:58','2025-12-29 00:29:58','StudyZone',0,NULL,'[\"Explain the meaning of living things.\",\"Identify examples of living things around them.\",\"Mention the characteristics of living things.\"]','[\"Teacher shows pictures or real objects of people, animals, and plants, then asks pupils: \'Can you tell me what all these things have in common?\'\",\"Class exercises to identify oneself as a living thing and match living things to their characteristics.\"]','Multiple-choice questions related to the characteristics and examples of living things.','[\"Flashcards showing living things (human, animals, plants)\",\"Charts of living and non-living things\",\"Real objects (leaves, insects, etc.)\",\"Video/picture illustrations\"]','https://studyzone.ng/lesson-notes/living-things-meaning-examples-and-characteristics/'),(10,'Mathematics',NULL,'P1',NULL,'First Term',1,'Number Recognition','Introduction to numbers, place value, and counting.','Pending',NULL,NULL,NULL,'2025-12-29 01:12:57','2025-12-29 01:12:57','StudyZone',0,NULL,'[\"Identify and write numbers from 1 to 100\",\"Understand the concept of place value\"]','[\"Number matching game\",\"Place value chart activity\"]','Observation and number writing exercise','[\"Number cards\",\"Place value charts\"]','https://studyzone.ng/primary-3/'),(11,'Mathematics',NULL,'P1',NULL,'First Term',2,'Addition and Subtraction','Basic addition and subtraction concepts, strategies for solving problems.','Pending',NULL,NULL,NULL,'2025-12-29 01:12:57','2025-12-29 01:12:57','StudyZone',0,NULL,'[\"Perform addition and subtraction of numbers up to 50\",\"Solve word problems involving addition and subtraction\"]','[\"Addition and subtraction bingo\",\"Word problem solving in pairs\"]','Quiz on addition and subtraction','[\"Bingo cards\",\"Word problem worksheets\"]','https://studyzone.ng/primary-3/'),(12,'Mathematics',NULL,'P1',NULL,'First Term',3,'Multiplication Basics','Introduction to multiplication, using arrays and groups.','Pending',NULL,NULL,NULL,'2025-12-29 01:12:57','2025-12-29 01:12:57','StudyZone',0,NULL,'[\"Understand the concept of multiplication as repeated addition\",\"Multiply numbers up to 10\"]','[\"Array building with counters\",\"Group multiplication games\"]','Worksheet on multiplication problems','[\"Counters\",\"Multiplication worksheets\"]','https://studyzone.ng/primary-3/'),(13,'Mathematics',NULL,'P1',NULL,'First Term',4,'Shapes and Geometry','Introduction to shapes, their properties, and real-life examples.','Pending',NULL,NULL,NULL,'2025-12-29 01:12:57','2025-12-29 01:12:57','StudyZone',0,NULL,'[\"Identify and describe basic 2D shapes\",\"Understand the properties of shapes\"]','[\"Shape scavenger hunt\",\"Drawing and labeling shapes\"]','Shape identification quiz','[\"Shape cutouts\",\"Drawing materials\"]','https://studyzone.ng/primary-3/'),(14,'Mathematics',NULL,'P1',NULL,'First Term',5,'Measurement','Introduction to measurement, using rulers and measuring tapes.','Pending',NULL,NULL,NULL,'2025-12-29 01:12:57','2025-12-29 01:12:57','StudyZone',0,NULL,'[\"Understand the concept of length and measurement\",\"Use standard units to measure objects\"]','[\"Measuring classroom objects\",\"Creating a measurement chart\"]','Measurement activity report','[\"Rulers\",\"Measuring tapes\"]','https://studyzone.ng/primary-3/'),(15,'English',NULL,'P1',NULL,'First Term',1,'Introduction to English Language','Students will learn about the English language, its significance in communication, and its basic components including nouns, verbs, and adjectives.','Pending',NULL,NULL,NULL,'2025-12-29 01:15:23','2025-12-29 01:15:23','StudyZone',0,NULL,'[\"Understand the importance of English language\",\"Identify basic components of English language\"]','[\"Group discussion on the importance of English\",\"Identify and list nouns, verbs, and adjectives from a short text\"]','Participation in group discussion and completion of the noun, verb, and adjective list','[\"Textbook on English language basics\",\"Whiteboard and markers\"]','https://studyzone.ng/primary-3/'),(16,'English',NULL,'P1',NULL,'First Term',2,'Parts of Speech','Focus on nouns, verbs, adjectives, and adverbs. Students will learn definitions and examples of each part of speech.','Pending',NULL,NULL,NULL,'2025-12-29 01:15:23','2025-12-29 01:15:23','StudyZone',0,NULL,'[\"Identify different parts of speech\",\"Use parts of speech in sentences\"]','[\"Create sentences using different parts of speech\",\"Parts of speech matching game\"]','Sentence creation exercise and participation in the matching game','[\"Parts of speech chart\",\"Flashcards\"]','https://studyzone.ng/primary-3/'),(17,'English',NULL,'P1',NULL,'First Term',3,'Sentence Structure','Introduction to subject, verb, and object in sentence construction. Students will learn how to form simple sentences.','Pending',NULL,NULL,NULL,'2025-12-29 01:15:23','2025-12-29 01:15:23','StudyZone',0,NULL,'[\"Understand the structure of simple sentences\",\"Construct simple sentences\"]','[\"Sentence building activity using word cards\",\"Peer review of constructed sentences\"]','Quality of constructed sentences and feedback from peer review','[\"Word cards\",\"Sentence structure worksheets\"]','https://studyzone.ng/primary-3/'),(18,'English',NULL,'P1',NULL,'First Term',4,'Reading Comprehension','Students will read a short story and learn to identify main ideas and supporting details.','Pending',NULL,NULL,NULL,'2025-12-29 01:15:23','2025-12-29 01:15:23','StudyZone',0,NULL,'[\"Develop skills for reading comprehension\",\"Answer questions based on a text\"]','[\"Read a selected story\",\"Group discussion on the story\'s main ideas\",\"Answer comprehension questions\"]','Comprehension questions and group discussion participation','[\"Selected short story\",\"Comprehension question handout\"]','https://studyzone.ng/primary-3/'),(19,'English',NULL,'P1',NULL,'First Term',5,'Creative Writing','Students will learn the basics of creative writing, focusing on using descriptive language to enhance their writing.','Pending',NULL,NULL,NULL,'2025-12-29 01:15:23','2025-12-29 01:15:23','StudyZone',0,NULL,'[\"Express ideas through creative writing\",\"Use descriptive language in writing\"]','[\"Write a short descriptive paragraph about a favorite place\",\"Share paragraphs with the class\"]','Quality of the descriptive paragraph and participation in sharing','[\"Writing journals\",\"Descriptive language examples\"]','https://studyzone.ng/primary-3/'),(20,'English',NULL,'P2',NULL,'First Term',1,'Introduction to Narrative Writing','Students will learn about the key components of narrative writing, including characters, setting, plot, conflict, and resolution.','Pending',NULL,NULL,NULL,'2025-12-29 01:16:52','2025-12-29 01:16:52','StudyZone',0,NULL,'[\"Understand the elements of a narrative\",\"Identify the structure of a story\"]','[\"Group discussion on favorite stories\",\"Create a story map for a familiar tale\"]','Participation in group discussion and completion of story map','[\"Story map template\",\"Examples of narrative stories\"]','https://studyzone.ng/primary-3/'),(21,'English',NULL,'P2',NULL,'First Term',2,'Descriptive Writing','Focus on using adjectives and adverbs to create descriptive passages.','Pending',NULL,NULL,NULL,'2025-12-29 01:16:52','2025-12-29 01:16:52','StudyZone',0,NULL,'[\"Use sensory details to enhance writing\",\"Create vivid imagery in descriptions\"]','[\"Write a descriptive paragraph about a chosen object\",\"Peer review of descriptive paragraphs\"]','Quality of descriptive writing and peer feedback','[\"Descriptive writing checklist\",\"Sample descriptive texts\"]','https://studyzone.ng/primary-3/'),(22,'English',NULL,'P2',NULL,'First Term',3,'Understanding Poetry','Introduction to various forms of poetry, including haikus, acrostics, and free verse.','Pending',NULL,NULL,NULL,'2025-12-29 01:16:52','2025-12-29 01:16:52','StudyZone',0,NULL,'[\"Identify different types of poetry\",\"Analyze the use of figurative language in poems\"]','[\"Read and discuss selected poems\",\"Write a simple poem using figurative language\"]','Participation in discussions and submission of original poem','[\"Poetry anthology\",\"Figurative language guide\"]','https://studyzone.ng/primary-3/'),(23,'English',NULL,'P2',NULL,'First Term',4,'Grammar: Parts of Speech','Review of the eight parts of speech with examples and exercises.','Pending',NULL,NULL,NULL,'2025-12-29 01:16:52','2025-12-29 01:16:52','StudyZone',0,NULL,'[\"Identify and use nouns, verbs, adjectives, and adverbs\",\"Construct sentences using different parts of speech\"]','[\"Parts of speech scavenger hunt\",\"Sentence construction exercises\"]','Completion of exercises and accuracy of sentence construction','[\"Parts of speech chart\",\"Worksheet on sentence construction\"]','https://studyzone.ng/primary-3/'),(24,'English',NULL,'P2',NULL,'First Term',5,'Writing a Book Report','Guidelines on how to write an effective book report.','Pending',NULL,NULL,NULL,'2025-12-29 01:16:52','2025-12-29 01:16:52','StudyZone',0,NULL,'[\"Summarize a book\'s plot and main ideas\",\"Express personal opinions about the book\"]','[\"Choose a book and prepare a report outline\",\"Present book reports to the class\"]','Quality of book report and presentation skills','[\"Book report template\",\"List of suggested books\"]','https://studyzone.ng/primary-3/'),(25,'Mathematics',NULL,'P1',NULL,'First Term',1,'Number Recognition','Introduction to numbers using visual aids and counting objects.','Pending',NULL,NULL,NULL,'2025-12-29 13:11:27','2025-12-29 13:11:27','StudyZone',0,'2025-12-29 13:11:27','[\"Identify numbers from 1 to 10\",\"Understand the concept of more and less\"]','[\"Counting objects in the classroom\",\"Number matching games\"]','Observation during activities and a short quiz on number recognition.','[\"Counting blocks\",\"Number flashcards\"]','https://studyzone.ng/'),(26,'Mathematics',NULL,'P1',NULL,'First Term',2,'Basic Addition','Teaching addition through practical examples and number lines.','Pending',NULL,NULL,NULL,'2025-12-29 13:11:27','2025-12-29 13:11:27','StudyZone',0,'2025-12-29 13:11:27','[\"Understand the concept of addition\",\"Add numbers up to 10\"]','[\"Using counters to demonstrate addition\",\"Simple addition worksheets\"]','Completion of addition worksheets and oral quizzes.','[\"Counters\",\"Addition worksheets\"]','https://studyzone.ng/'),(27,'Mathematics',NULL,'P1',NULL,'First Term',3,'Shapes and Patterns','Exploring shapes through drawing and identifying patterns in everyday objects.','Pending',NULL,NULL,NULL,'2025-12-29 13:11:27','2025-12-29 13:11:27','StudyZone',0,'2025-12-29 13:11:27','[\"Identify basic shapes\",\"Recognize and create patterns\"]','[\"Shape scavenger hunt\",\"Creating patterns with colored blocks\"]','Shape identification quiz and pattern creation project.','[\"Shape cutouts\",\"Colored blocks\"]','https://studyzone.ng/'),(28,'Basic Science & Technology','Basic Science & Technology','JSS1','JSS1','First Term',8,'Photosynthesis','Process of photosynthesis, chlorophyll, sunlight, carbon dioxide, oxygen','Pending',NULL,NULL,NULL,'2025-12-31 23:52:57','2025-12-31 23:52:57',NULL,1,NULL,'Students will understand how plants make their own food',NULL,NULL,NULL,NULL),(29,'Basic Science & Technology','Basic Science & Technology','JSS1','JSS1','First Term',2,'Characteristics of Living Things','Movement, respiration, nutrition, growth, reproduction','Pending',NULL,NULL,NULL,'2025-12-31 23:52:57','2025-12-31 23:52:57',NULL,1,NULL,'Identify features that distinguish living from non-living things',NULL,NULL,NULL,NULL),(30,'Basic Science & Technology','Basic Science & Technology','JSS1','JSS1','Second Term',12,'States of Matter','Solid, liquid, gas, changes of state','Pending',NULL,NULL,NULL,'2025-12-31 23:52:57','2025-12-31 23:52:57',NULL,1,NULL,'Describe the three states of matter',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `syllabus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `syllabus_suggestions`
--

DROP TABLE IF EXISTS `syllabus_suggestions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `syllabus_suggestions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject_code` varchar(50) DEFAULT NULL,
  `class_code` varchar(50) DEFAULT NULL,
  `topic_keywords` text DEFAULT NULL,
  `syllabus_content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`syllabus_content`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `prerequisites` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`prerequisites`)),
  `difficulty_level` tinyint(4) DEFAULT 1,
  `estimated_duration` int(11) DEFAULT 40,
  `sequence_order` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `subject_code` (`subject_code`,`class_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `syllabus_suggestions`
--

LOCK TABLES `syllabus_suggestions` WRITE;
/*!40000 ALTER TABLE `syllabus_suggestions` DISABLE KEYS */;
INSERT INTO `syllabus_suggestions` VALUES (1,'Basic Science & Technology','JSS1','Living things characteristics movement respiration nutrition growth reproduction','{\"topic\": \"Characteristics of Living Things\", \"subtopic\": \"Movement, respiration, nutrition, growth, reproduction\", \"learning_objectives\": \"Identify features that distinguish living from non-living things\", \"week_number\": 2, \"term\": \"First Term\"}','2026-01-01 00:09:17','[]',1,40,2),(2,'Basic Science & Technology','JSS1','Classification living things plants animals microorganisms','{\"topic\": \"Classification of Living Things\", \"subtopic\": \"Plants, animals, microorganisms\", \"learning_objectives\": \"Group living things based on their characteristics\", \"week_number\": 4, \"term\": \"First Term\"}','2026-01-01 00:09:17','[\"Characteristics of Living Things\"]',2,45,4),(3,'Basic Science & Technology','JSS1','Photosynthesis chlorophyll sunlight carbon dioxide oxygen','{\"topic\": \"Photosynthesis\", \"subtopic\": \"Process of photosynthesis, chlorophyll, sunlight, carbon dioxide, oxygen\", \"learning_objectives\": \"Students will understand how plants make their own food\", \"week_number\": 8, \"term\": \"First Term\"}','2026-01-01 00:09:17','[\"Classification of Living Things\"]',2,60,8),(4,'Basic Science & Technology','JSS1','States matter solid liquid gas changes','{\"topic\": \"States of Matter\", \"subtopic\": \"Solid, liquid, gas, changes of state\", \"learning_objectives\": \"Describe the three states of matter\", \"week_number\": 12, \"term\": \"Second Term\"}','2026-01-01 00:09:17','[]',1,45,12),(5,'Basic Science & Technology','JSS1','Simple machines lever pulley inclined plane','{\"topic\": \"Simple Machines\", \"subtopic\": \"Lever, pulley, inclined plane, wheel and axle\", \"learning_objectives\": \"Identify and explain how simple machines work\", \"week_number\": 15, \"term\": \"Second Term\"}','2026-01-01 00:09:17','[\"States of Matter\"]',3,50,15);
/*!40000 ALTER TABLE `syllabus_suggestions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `syllabus_tracker`
--

DROP TABLE IF EXISTS `syllabus_tracker`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `syllabus_tracker` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teacher_id` int(11) NOT NULL DEFAULT 1,
  `title` varchar(300) DEFAULT NULL,
  `lesson_date` date DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT 40,
  `objectives` text DEFAULT NULL,
  `lesson_content` text DEFAULT NULL,
  `activities` text DEFAULT NULL,
  `resources` text DEFAULT NULL,
  `assessment_methods` text DEFAULT NULL,
  `homework` text DEFAULT NULL,
  `syllabus_id` int(11) DEFAULT NULL,
  `subject` varchar(100) NOT NULL,
  `class_code` varchar(30) DEFAULT NULL,
  `term` varchar(50) NOT NULL,
  `academic_year` year(4) NOT NULL,
  `week` tinyint(1) DEFAULT NULL,
  `status` enum('draft','submitted','under_review','approved','rejected','archived','Pending','Ongoing','Onhold','Completed') DEFAULT 'draft',
  `submitted_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_comments` text DEFAULT NULL,
  `ai_generated` tinyint(1) DEFAULT 0,
  `ai_enhancement_type` varchar(50) DEFAULT NULL,
  `ai_confidence_score` decimal(3,2) DEFAULT NULL,
  `school_id` varchar(20) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `syllabus_id` (`syllabus_id`),
  KEY `syllabus_tracker_teacher_id_lesson_date` (`teacher_id`,`lesson_date`),
  KEY `syllabus_tracker_syllabus_id` (`syllabus_id`),
  KEY `syllabus_tracker_status` (`status`),
  KEY `syllabus_tracker_ai_generated` (`ai_generated`),
  CONSTRAINT `syllabus_tracker_ibfk_1` FOREIGN KEY (`syllabus_id`) REFERENCES `syllabus` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `syllabus_tracker`
--

LOCK TABLES `syllabus_tracker` WRITE;
/*!40000 ALTER TABLE `syllabus_tracker` DISABLE KEYS */;
/*!40000 ALTER TABLE `syllabus_tracker` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-04 12:43:31
