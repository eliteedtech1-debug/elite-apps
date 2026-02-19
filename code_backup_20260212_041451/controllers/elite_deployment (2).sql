-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 16, 2025 at 07:33 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `elite_deployment`
--

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

CREATE TABLE `assignments` (
  `id` int(11) NOT NULL,
  `teacher_id` int(10) DEFAULT NULL,
  `class_name` varchar(255) DEFAULT NULL,
  `class_code` varchar(20) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `subject_code` varchar(20) NOT NULL,
  `assignment_date` date DEFAULT cast(current_timestamp() as date),
  `submission_date` date DEFAULT NULL,
  `attachment` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `teacher_name` varchar(100) DEFAULT NULL,
  `title` varchar(259) DEFAULT NULL,
  `marks` int(2) NOT NULL DEFAULT 0,
  `status` enum('Opened','Closed','Adjusted','Released') NOT NULL DEFAULT 'Opened',
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) NOT NULL,
  `academic_year` varchar(9) NOT NULL,
  `term` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assignments`
--

INSERT INTO `assignments` (`id`, `teacher_id`, `class_name`, `class_code`, `subject`, `subject_code`, `assignment_date`, `submission_date`, `attachment`, `content`, `teacher_name`, `title`, `marks`, `status`, `school_id`, `branch_id`, `academic_year`, `term`, `created_at`, `updated_at`) VALUES
(1, 1, 'Nursery 1', 'CLS0001', 'English Language', 'SBJ0001', '2025-09-13', '2025-09-10', NULL, NULL, 'Ishaq Ibrahim', 'testing this assignment if it will work', 20, 'Opened', 'SCH/1', 'BRCH00001', '2024/2025', 'Third Term', '2025-09-13 09:19:29', '2025-09-13 09:32:30'),
(2, 1, 'Nursery 1', 'CLS0001', 'English Language', 'SBJ0001', '2025-09-13', '2025-09-12', NULL, NULL, 'Ishaq Ibrahim', 'assignment date', 40, 'Opened', 'SCH/1', 'BRCH00001', '2024/2025', 'Third Term', '2025-09-13 09:35:48', '2025-09-13 09:35:48'),
(3, 1, 'Nursery 1', 'CLS0001', 'English Language', 'SBJ0001', '2025-09-13', '2025-09-12', NULL, NULL, 'Ishaq Ibrahim', 'hhh', 50, 'Released', 'SCH/1', 'BRCH00001', '2024/2025', 'Third Term', '2025-09-13 13:41:27', '2025-09-13 19:15:16');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_questions`
--

CREATE TABLE `assignment_questions` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `attachment_url` varchar(300) DEFAULT NULL,
  `question_type` enum('Multiple Choice','True/False','Short Answer','Fill in the Blank','Essay') NOT NULL DEFAULT 'Short Answer',
  `options` longtext DEFAULT NULL CHECK (json_valid(`options`)),
  `marks` decimal(5,2) DEFAULT NULL,
  `correct_answer` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assignment_questions`
--

INSERT INTO `assignment_questions` (`id`, `assignment_id`, `question_text`, `attachment_url`, `question_type`, `options`, `marks`, `correct_answer`) VALUES
(1, 1, 'what is my name', 'https://res.cloudinary.com/salamcom/image/upload/v1738684878/uploads/zx7up7w9zj75xxpeqdxy.jpg', 'Multiple Choice', '[{\"value\":\"nazif\",\"is_correct\":true},{\"value\":\"abdullahi\",\"is_correct\":false},{\"value\":\"tijjani\",\"is_correct\":false},{\"value\":\"yusuf\",\"is_correct\":false}]', 10.00, 'nazif'),
(2, 1, 'ya sunan mama. na', 'https://res.cloudinary.com/salamcom/image/upload/v1738684878/uploads/zx7up7w9zj75xxpeqdxy.jpg', 'Multiple Choice', '[{\"value\":\"khadija\",\"is_correct\":false},{\"value\":\"hauwa\",\"is_correct\":true},{\"value\":\"jummai\",\"is_correct\":false},{\"value\":\"yusuf\",\"is_correct\":false}]', 10.00, 'hauwa'),
(3, 2, 'hhhdhdh', 'https://res.cloudinary.com/salamcom/image/upload/v1738684878/uploads/zx7up7w9zj75xxpeqdxy.jpg', 'Multiple Choice', '[{\"value\":\"Kano\",\"is_correct\":false},{\"value\":\"100\",\"is_correct\":false},{\"value\":\"dh\",\"is_correct\":true},{\"value\":\"sh\",\"is_correct\":false}]', 10.00, 'dh'),
(4, 2, 'whhhwhhd', 'https://res.cloudinary.com/salamcom/image/upload/v1738684878/uploads/zx7up7w9zj75xxpeqdxy.jpg', 'Short Answer', 'null', 10.00, 'dggd'),
(5, 2, 'hhwjd', 'https://res.cloudinary.com/salamcom/image/upload/v1738684878/uploads/zx7up7w9zj75xxpeqdxy.jpg', 'True/False', 'null', 10.00, 'True'),
(6, 2, 'hshhjdjj', 'https://res.cloudinary.com/salamcom/image/upload/v1738684878/uploads/zx7up7w9zj75xxpeqdxy.jpg', 'Fill in the Blank', 'null', 10.00, 'hhhhshd'),
(7, 3, 'mother fucker', 'https://res.cloudinary.com/salamcom/image/upload/v1738684878/uploads/zx7up7w9zj75xxpeqdxy.jpg', 'Short Answer', 'null', 10.00, 'corect. one'),
(9, 3, 'corected word', 'https://res.cloudinary.com/salamcom/image/upload/v1738684878/uploads/zx7up7w9zj75xxpeqdxy.jpg', 'Short Answer', NULL, 10.00, 'and answer'),
(10, 3, 'a very short text', 'https://res.cloudinary.com/salamcom/image/upload/v1738684878/uploads/zx7up7w9zj75xxpeqdxy.jpg', 'Short Answer', 'null', 10.00, 'technologie'),
(11, 3, 'wassup', 'https://res.cloudinary.com/salamcom/image/upload/v1738684878/uploads/zx7up7w9zj75xxpeqdxy.jpg', 'Multiple Choice', '[{\"value\":\"Kano\"},{\"value\":\"Niger\"},{\"value\":\"correct\"},{\"value\":\"Lagos\"}]', 10.00, 'correct'),
(12, 3, 'ahahhahah', NULL, 'Multiple Choice', '[{\"value\":\"laugh\"},{\"value\":\"Niger\"},{\"value\":\"Kogi\"},{\"value\":\"agag\"}]', 5.00, 'Kogi');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_responses`
--

CREATE TABLE `assignment_responses` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `admission_no` varchar(15) NOT NULL,
  `subject` varchar(30) DEFAULT NULL,
  `response` text NOT NULL,
  `remark` varchar(200) DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `marks` decimal(5,2) DEFAULT NULL,
  `score` decimal(3,1) DEFAULT 0.0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assignment_responses`
--

INSERT INTO `assignment_responses` (`id`, `assignment_id`, `question_id`, `admission_no`, `subject`, `response`, `remark`, `is_correct`, `marks`, `score`, `created_at`, `updated_at`) VALUES
(2, 3, 9, '213232/1/0001', 'English Language', 'shshsh', 'i dash you this one', 0, 10.00, 10.0, '2025-09-13 17:36:49', '2025-09-13 18:57:25'),
(3, 3, 10, '213232/1/0001', 'English Language', 'jjjj', '', 0, 10.00, 0.0, '2025-09-13 17:36:49', '2025-09-13 18:52:09'),
(4, 3, 11, '213232/1/0001', 'English Language', 'correct', '', 1, 10.00, 10.0, '2025-09-13 17:36:49', '2025-09-13 18:32:44'),
(5, 3, 12, '213232/1/0001', 'English Language', 'Kogi', '', 1, 5.00, 5.0, '2025-09-13 17:36:49', '2025-09-13 18:32:44'),
(6, 3, 7, '213232/1/0001', 'English Language', 'corect. one', 'yeah it was great', 1, 10.00, 10.0, '2025-09-13 17:39:01', '2025-09-13 18:32:44');

-- --------------------------------------------------------

--
-- Table structure for table `classes`
--

CREATE TABLE `classes` (
  `class_name` varchar(100) NOT NULL,
  `class_code` varchar(30) NOT NULL,
  `section` varchar(30) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `capacity` int(11) DEFAULT NULL,
  `school_id` varchar(20) NOT NULL,
  `branch_id` varchar(20) NOT NULL,
  `level` int(100) DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `classes`
--

INSERT INTO `classes` (`class_name`, `class_code`, `section`, `created_at`, `updated_at`, `capacity`, `school_id`, `branch_id`, `level`, `status`) VALUES
('BASIC 1', 'CLS0007', 'PRIMARY', '2025-09-01 23:38:05', '2025-09-01 23:38:05', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('BASIC 1 NS', 'CLS0025', 'PRIMARY', '2025-09-02 23:30:55', '2025-09-02 23:30:55', NULL, 'SCH/10', 'BRCH00012', NULL, 'Active'),
('BASIC 2', 'CLS0008', 'PRIMARY', '2025-09-01 23:38:13', '2025-09-01 23:38:13', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('BASIC 2 NS', 'CLS0026', 'PRIMARY', '2025-09-02 23:31:54', '2025-09-02 23:31:54', NULL, 'SCH/10', 'BRCH00012', NULL, 'Active'),
('BASIC 3', 'CLS0009', 'PRIMARY', '2025-09-01 23:38:33', '2025-09-01 23:38:33', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('BASIC 3 NS', 'CLS0027', 'PRIMARY', '2025-09-02 23:32:15', '2025-09-02 23:32:15', NULL, 'SCH/10', 'BRCH00012', NULL, 'Active'),
('BASIC 4', 'CLS0010', 'PRIMARY', '2025-09-01 23:38:38', '2025-09-01 23:38:38', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('BASIC 4 NS', 'CLS0028', 'PRIMARY', '2025-09-02 23:33:01', '2025-09-02 23:33:01', NULL, 'SCH/10', 'BRCH00012', NULL, 'Active'),
('BASIC 5', 'CLS0011', 'PRIMARY', '2025-09-01 23:38:48', '2025-09-01 23:38:48', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('BASIC 6', 'CLS0012', 'PRIMARY', '2025-09-01 23:38:53', '2025-09-01 23:38:53', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('JSS 1', 'CLS0013', 'JUNIOR SECONDARY', '2025-09-01 23:41:38', '2025-09-01 23:41:38', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('JSS 2', 'CLS0014', 'JUNIOR SECONDARY', '2025-09-01 23:41:48', '2025-09-01 23:41:48', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('JSS 3', 'CLS0015', 'JUNIOR SECONDARY', '2025-09-01 23:41:58', '2025-09-01 23:41:58', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('LOWER KG', 'CLS0005', 'NURSERY', '2025-09-01 22:54:56', '2025-09-01 22:54:56', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('LOWER KG NS', 'CLS0023', 'NURSERY', '2025-09-02 23:24:51', '2025-09-02 23:24:51', NULL, 'SCH/10', 'BRCH00012', NULL, 'Active'),
('Nursery 1', 'CLS0001', 'NURSERY', '2025-08-27 15:09:41', '2025-08-27 15:09:41', NULL, 'SCH/1', 'BRCH00001', NULL, 'Active'),
('Nursery 2', 'CLS0002', 'NURSERY', '2025-08-27 15:09:52', '2025-08-27 15:09:52', NULL, 'SCH/1', 'BRCH00001', NULL, 'Active'),
('Primary 1', 'CLS0003', 'PRIMARY', '2025-08-27 15:10:07', '2025-08-27 15:10:07', NULL, 'SCH/1', 'BRCH00001', NULL, 'Active'),
('Primary 2', 'CLS0004', 'PRIMARY', '2025-08-30 20:08:25', '2025-08-30 20:08:25', NULL, 'SCH/1', 'BRCH00001', NULL, 'Active'),
('Primary 3', 'CLS0022', 'PRIMARY', '2025-09-02 11:55:46', '2025-09-02 11:55:46', NULL, 'SCH/1', 'BRCH00001', NULL, 'Active'),
('SS 1', 'CLS0016', 'SENIOR SECONDARY', '2025-09-01 23:46:57', '2025-09-01 23:46:57', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('SS 1 NS', 'CLS0029', 'SENIOR SECONDARY', '2025-09-02 23:33:35', '2025-09-02 23:33:35', NULL, 'SCH/10', 'BRCH00012', NULL, 'Active'),
('SS 2', 'CLS0019', 'SENIOR SECONDARY', '2025-09-01 23:49:47', '2025-09-01 23:49:47', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('SS 2 NS', 'CLS0031', 'SENIOR SECONDARY', '2025-09-02 23:35:14', '2025-09-02 23:35:14', NULL, 'SCH/10', 'BRCH00012', NULL, 'Active'),
('SS 3', 'CLS0020', 'SENIOR SECONDARY', '2025-09-01 23:49:58', '2025-09-01 23:49:58', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('SS 3 NS', 'CLS0030', 'SENIOR SECONDARY', '2025-09-02 23:34:37', '2025-09-02 23:34:37', NULL, 'SCH/10', 'BRCH00012', NULL, 'Active'),
('UPPER KG', 'CLS0021', 'NURSERY', '2025-09-02 01:11:35', '2025-09-02 01:11:35', NULL, 'SCH/1', 'BRCH00001', NULL, 'Active'),
('UPPER KG', 'CLS0006', 'NURSERY', '2025-09-01 22:55:21', '2025-09-01 22:55:21', NULL, 'SCH/10', 'BRCH00011', NULL, 'Active'),
('UPPER KG NS', 'CLS0024', 'NURSERY', '2025-09-02 23:30:36', '2025-09-02 23:30:36', NULL, 'SCH/10', 'BRCH00012', NULL, 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `class_role`
--

CREATE TABLE `class_role` (
  `class_role_id` varchar(30) NOT NULL,
  `teacher_id` int(10) NOT NULL,
  `section_id` varchar(100) NOT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `class_code` varchar(20) NOT NULL,
  `role` varchar(100) NOT NULL,
  `school_id` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `class_role`
--

INSERT INTO `class_role` (`class_role_id`, `teacher_id`, `section_id`, `class_name`, `class_code`, `role`, `school_id`) VALUES
('CR//00002', 2, 'NURSERY', 'Nursery 1', 'CLS0001', 'Form Master', 'SCH/1'),
('CR//00001', 17, 'PRIMARY', 'Primary 1', 'CLS0003', 'Form Master', 'SCH/1'),
('CR//00001', 73, 'PRIMARY', NULL, 'CLS0070', 'Form Master', 'SCH/1'),
('CR//00002', 75, 'NURSERY', NULL, 'CLS0075', 'Form Master', 'SCH/1'),
('CR//00003', 76, 'PRIMARY', 'primary 4a', 'PR0012', 'Form Master', 'SCH/1'),
('CR//00004', 77, 'PRIMARY', 'Primary 5', 'PR0013', 'Form Master', 'SCH/1');

-- --------------------------------------------------------

--
-- Table structure for table `lessons`
--

CREATE TABLE `lessons` (
  `id` int(11) NOT NULL,
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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lessons`
--

INSERT INTO `lessons` (`id`, `class_name`, `class_code`, `subject`, `lesson_date`, `attachment`, `content`, `materials`, `objectives`, `teacher`, `teacher_id`, `title`, `school_id`, `branch_id`, `academic_year`, `term`, `duration`, `created_at`, `updated_at`) VALUES
(1, NULL, 'CLS0001', 'SBJ0001', '2025-09-17', NULL, 'this is the lesson content', 'this are the required resources', NULL, 'Ishaq Ibrahim', '1', 'this is a lesson title', 'SCH/1', 'BRCH00001', '2024/2025', 'Third Term', 45, '2025-09-16 15:33:32', '2025-09-16 15:33:32');

-- --------------------------------------------------------

--
-- Table structure for table `lesson_comments`
--

CREATE TABLE `lesson_comments` (
  `id` int(11) NOT NULL,
  `user_id` varchar(15) NOT NULL,
  `user_name` varchar(50) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lesson_id` int(11) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lesson_comments`
--

INSERT INTO `lesson_comments` (`id`, `user_id`, `user_name`, `user_role`, `comment`, `created_at`, `updated_at`, `lesson_id`, `parent_id`) VALUES
(1, '737', 'Ishaq Ibrahim', 'Teacher', 'whhhavsud', '2025-09-16 16:37:40', '2025-09-16 16:37:40', 1, NULL),
(2, '737', 'Ishaq Ibrahim', 'Teacher', 'djdjdj', '2025-09-16 16:37:45', '2025-09-16 16:37:45', 1, 1),
(3, '737', 'Ishaq Ibrahim', 'Teacher', 'mother fucker', '2025-09-16 17:00:41', '2025-09-16 17:00:41', 1, 1),
(4, '737', 'Ishaq Ibrahim', 'Teacher', 'mother', '2025-09-16 17:00:54', '2025-09-16 17:00:54', 1, 2),
(5, '737', 'Ishaq Ibrahim', 'Teacher', 'whatsover', '2025-09-16 17:01:07', '2025-09-16 17:01:07', 1, NULL),
(6, '737', 'Ishaq Ibrahim', 'Teacher', 'oyana', '2025-09-16 17:11:14', '2025-09-16 17:11:14', 1, 4),
(7, '737', 'Ishaq Ibrahim', 'Teacher', 'haah', '2025-09-16 17:15:54', '2025-09-16 17:15:54', 1, 2),
(8, '737', 'Ishaq Ibrahim', 'Teacher', 'nednndnjddjdj', '2025-09-16 17:24:19', '2025-09-16 17:24:19', 1, NULL),
(9, '737', 'Ishaq Ibrahim', 'Teacher', 'nednndnjddjdj', '2025-09-16 17:24:19', '2025-09-16 17:24:19', 1, NULL),
(10, '737', 'Ishaq Ibrahim', 'Teacher', 'rhrh', '2025-09-16 17:25:53', '2025-09-16 17:25:53', 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `lesson_time_table`
--

CREATE TABLE `lesson_time_table` (
  `id` int(11) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lesson_time_table`
--

INSERT INTO `lesson_time_table` (`id`, `day`, `class_name`, `subject`, `teacher_id`, `section`, `school_location`, `start_time`, `end_time`, `status`, `school_id`, `branch_id`, `class_code`, `created_at`, `updated_at`) VALUES
(1, 'Monday', 'Nursery 1', 'English Language', 1, 'NURSERY', 'BRCH00001', '8:00: AM', '8:45: AM', 'Active', 'SCH/1', 'BRCH00001', 'CLS0001', '2025-09-16 14:33:30', '2025-09-16 14:33:30'),
(2, 'Tuesday', 'Nursery 1', 'English Language', 1, 'NURSERY', 'BRCH00001', '8:00: AM', '8:45: AM', 'Active', 'SCH/1', 'BRCH00001', 'CLS0001', '2025-09-16 14:33:42', '2025-09-16 14:33:42'),
(3, 'Wednesday', 'Nursery 1', 'English Language', 1, 'NURSERY', 'BRCH00001', '8:00: AM', '8:45: AM', 'Active', 'SCH/1', 'BRCH00001', 'CLS0001', '2025-09-16 14:33:51', '2025-09-16 14:33:51'),
(4, 'Thursday', 'Nursery 1', 'English Language', 1, 'NURSERY', 'BRCH00001', '8:00: AM', '8:45: AM', 'Active', 'SCH/1', 'BRCH00001', 'CLS0001', '2025-09-16 14:34:00', '2025-09-16 14:34:00'),
(5, 'Friday', 'Nursery 1', 'English Language', 1, 'NURSERY', 'BRCH00001', '8:00: AM', '8:45: AM', 'Active', 'SCH/1', 'BRCH00001', 'CLS0001', '2025-09-16 14:34:09', '2025-09-16 14:34:09');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `app_id` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL,
  `parent_id` varchar(25) DEFAULT NULL,
  `guardian_id` int(11) DEFAULT NULL,
  `student_name` varchar(255) NOT NULL,
  `surname` varchar(100) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `other_names` varchar(100) DEFAULT NULL,
  `user_type` varchar(255) NOT NULL DEFAULT 'Student',
  `home_address` text DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `sex` varchar(10) DEFAULT NULL,
  `religion` varchar(50) DEFAULT NULL,
  `tribe` varchar(50) DEFAULT NULL,
  `state_of_origin` varchar(100) DEFAULT NULL,
  `l_g_a` varchar(100) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `last_school_attended` varchar(100) DEFAULT NULL,
  `special_health_needs` varchar(100) DEFAULT NULL,
  `blood_group` varchar(100) DEFAULT NULL,
  `admission_no` varchar(50) NOT NULL,
  `admission_date` date DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `status` varchar(100) DEFAULT NULL,
  `section` varchar(100) DEFAULT NULL,
  `mother_tongue` varchar(100) DEFAULT NULL,
  `language_known` varchar(100) DEFAULT NULL,
  `current_class` varchar(50) DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `profile_picture` varchar(300) DEFAULT NULL,
  `medical_condition` varchar(300) DEFAULT NULL,
  `transfer_certificate` varchar(500) DEFAULT NULL,
  `reason` varchar(150) DEFAULT NULL,
  `branch_id` varchar(200) NOT NULL,
  `school_id` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`app_id`, `id`, `parent_id`, `guardian_id`, `student_name`, `surname`, `first_name`, `other_names`, `user_type`, `home_address`, `date_of_birth`, `sex`, `religion`, `tribe`, `state_of_origin`, `l_g_a`, `nationality`, `last_school_attended`, `special_health_needs`, `blood_group`, `admission_no`, `admission_date`, `academic_year`, `status`, `section`, `mother_tongue`, `language_known`, `current_class`, `class_name`, `profile_picture`, `medical_condition`, `transfer_certificate`, `reason`, `branch_id`, `school_id`, `password`, `created_at`, `updated_at`) VALUES
(NULL, 1, NULL, NULL, 'MUHAMMAD ALIYU', 'MUHAMMAD', 'ALIYU', NULL, 'Student', '', '2025-08-27', 'Male', '', '', '', '', NULL, NULL, '', '', '213232/1/0001', '2025-08-29', '2025/2026', 'transferred', 'NURSERY', '', '', 'CLS0001', 'Nursery 1', '', '', NULL, 'Transfared  other school', 'BRCH00001', 'SCH/1', '', '2025-08-31 18:45:17', '2025-08-31 18:45:17'),
(NULL, 2, 'PAR/213232/00001', NULL, 'ISHAQ IBRAHIM', 'ISHAQ', 'IBRAHIM', NULL, 'Student', NULL, NULL, 'Male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0002', '2025-08-30', NULL, 'withdrawn', 'NURSERY', NULL, NULL, 'CLS0001', 'Nursery 1', NULL, NULL, NULL, 'Vhjjh', 'BRCH00001', 'SCH/1', '$2a$10$dPFacGJ/jOOjMD0.WUOvQuU0BcRKyZMpkW2LlFcaL4NiUfd.fDhh.', '2025-08-31 18:45:17', '2025-08-31 18:45:17'),
(NULL, 3, 'PAR/213232/00001', NULL, 'HALIFA NAGUDU', 'HALIFA', 'NAGUDU', NULL, 'Student', NULL, NULL, 'Male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0003', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0001', 'Nursery 1', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$tOryo3GhfjB3U.dB3i8CquKF3EEQrzRRwpjjhzSXAkPo3YnxSATG2', '2025-08-31 18:45:17', '2025-09-08 14:53:54'),
(NULL, 4, NULL, NULL, 'ISHAQ TEST', 'ISHAQ', 'TEST', NULL, 'Student', NULL, NULL, 'Male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0004', '2025-09-01', NULL, 'Inactive', 'NURSERY', NULL, NULL, 'CLS0002', 'Nursery 2', NULL, NULL, NULL, 'Fyuhg', 'BRCH00001', 'SCH/1', '$2a$10$UvCT5DCRMthOjRjUCDXXa.bwb8xlti2wRY9i4PQ0yJcm4sAL/43OW', '2025-08-31 18:45:17', '2025-09-01 09:30:42'),
(NULL, 5, NULL, NULL, 'MUSA HASSAN NEW', 'MUSA', 'HASSAN', 'NEW', 'Student', NULL, NULL, 'Male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0005', '2025-09-01', NULL, 'Inactive', 'PRIMARY', NULL, NULL, 'CLS0003', 'Primary 1', NULL, NULL, NULL, 'Ghhjhg', 'BRCH00001', 'SCH/1', '$2a$10$1JNnblF3mhwFQ9NzcwS2C.ih.L2R/o1h/JMIDVZ4Q8ST8Ry67ta0.', '2025-08-31 18:45:17', '2025-09-01 09:28:53'),
(NULL, 6, NULL, NULL, 'NUSAIBA BAGWAI', 'NUSAIBA', 'BAGWAI', NULL, 'Student', NULL, NULL, 'Female', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0006', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0003', 'Primary 1', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$qTqdbXvArnrDsg4s95swtOXai7p7OGzwImO6P5YkLSxOM9WYy.Xim', '2025-08-31 20:11:06', '2025-08-31 20:11:06'),
(NULL, 8, NULL, NULL, 'Ibrahim Ishaq', 'Ibrahim', 'Ishaq', NULL, 'Student', 'F1 Sani Abacha way, Airport road, Kano Nigeria', '2025-09-01', 'Male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0007', NULL, '2025/2026', 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0004', 'Primary 2', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$PrgoWzI0wkqHYeZe95AIZuxyA2K8yhLSl2Xqu4C96lMyHRyUsgJB6', '2025-09-01 19:46:33', '2025-09-01 19:46:33'),
(NULL, 9, NULL, NULL, 'Aliyu muhammad', 'Aliyu', 'muhammad', NULL, 'Student', 'Mariri Dulo', '2025-09-01', 'Male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0008', NULL, '2025/2026', 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0003', 'Primary 1', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$e7DKIkZoSDfXzGKXhmP37udC3umYPkAX/K6eLtSkXM78yT5qAIHYS', '2025-09-01 19:57:34', '2025-09-01 19:57:34'),
(NULL, 10, NULL, NULL, 'Aliyu Bilkisu ', 'Aliyu', 'Bilkisu ', NULL, 'Student', NULL, '2025-09-01', 'Female', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0009', NULL, '2025/2026', 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0003', 'Primary 1', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$WnNoimaqPpWphohJMrkObePw6M4z2cqf1KjZF.hMvIkChbXo.35Hi', '2025-09-01 19:59:31', '2025-09-01 19:59:31'),
(NULL, 11, 'PAR/213232/00001', NULL, 'MUHAMMAD HAMZA', 'MUHAMMAD', 'HAMZA', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0010', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0004', 'Primary 2', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$knLdFhdyYnSohRIG.2/hYutB8Nmo/5rRuxfB6/Kx5gW9ZbXIBozCi', '2025-09-01 20:30:12', '2025-09-08 14:48:38'),
(NULL, 12, NULL, NULL, 'FATIMA YUNUS', 'FATIMA', 'YUNUS', NULL, 'Student', NULL, NULL, 'FEMALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0011', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0004', 'Primary 2', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$CPISSHLqQ5KulV08SrBCTOGgys.RCbjAEE.KnjAc7R5YDBQ0zcg/u', '2025-09-01 20:30:12', '2025-09-01 20:30:12'),
(NULL, 13, NULL, NULL, 'LABAHANI IMAM', 'LABAHANI', 'IMAM', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0012', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0004', 'Primary 2', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$4xmHIgiDhMJb95Bk2tFAqOWWvmuqH/2HilmuFbr/XlWd3tzyN04rq', '2025-09-01 20:30:12', '2025-09-01 20:30:12'),
(NULL, 14, NULL, NULL, 'YARO YARO', 'YARO', 'YARO', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0013', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0004', 'Primary 2', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$Z1mwrBp/YyvnM1qDGiiyUuBZxcbDMH.FAXrzAyS0m/x7NZGcQjgAy', '2025-09-01 20:30:12', '2025-09-01 20:30:12'),
(NULL, 15, NULL, NULL, 'MUSA SHEHU', 'MUSA', 'SHEHU', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0014', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0004', 'Primary 2', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$rd2wkpWGC52T2c1rbznTOu9Xvr2i.dk9vYJXFE/dT2WfPKOaVC5qe', '2025-09-01 20:30:12', '2025-09-01 20:30:12'),
(NULL, 16, NULL, NULL, 'NEW STUDENT TEST', 'NEW', 'STUDENT', 'TEST', 'Student', NULL, '2025-09-02', 'Female', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0015', NULL, '2025/2026', 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0004', 'Primary 2', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$P6WYsPuj9uvGcLPji48K0eEToIN9xrWf8TqlwQ8uJ022S6X.2KXe.', '2025-09-02 00:30:13', '2025-09-02 00:30:13'),
(NULL, 17, NULL, NULL, 'MURATALA HALIMA', 'MURATALA', 'HALIMA', NULL, 'Student', NULL, '2025-09-02', 'Female', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0016', NULL, '2025/2026', 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0003', 'Primary 1', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$hPOEAbRKEykA/1yNqWlFYegu8WrEws7S49gp3LzTK2l7Yxm7V7G8m', '2025-09-02 00:51:15', '2025-09-02 00:51:15'),
(NULL, 18, NULL, NULL, 'Aliyu muhammad Ibrahim', 'Aliyu', 'muhammad', 'Ibrahim', 'Student', 'Mariri Dulo', '2025-09-02', 'Male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0017', NULL, '2025/2026', 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0003', 'Primary 1', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$whJUzPlt4f4qr/EXf4ysrO2pi1qh6OW0d1EOXeoxrLrbfr.5WwpB6', '2025-09-02 07:11:47', '2025-09-02 07:11:47'),
(NULL, 19, NULL, NULL, 'Amal Mubarak', 'Amal', 'Mubarak', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '213232/1/0018', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0021', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00001', 'SCH/1', '$2a$10$UJB/Sa/4Zbr6dJS9Z4dvUuX5kx3rWpo.ORuspZDytCh.Nbl6XKw0K', '2025-09-02 07:17:39', '2025-09-02 07:17:39'),
(NULL, 20, NULL, NULL, 'Aliyu muhammad Musa', 'Aliyu', 'muhammad', 'Musa', 'Student', 'Mariri Dulo', '2025-09-02', 'Male', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0001', NULL, '2025/2026', 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$s8fJq8j/gfK25378Lr38Ke3yGkc.WG.W5oL.n8v/NKqo5B1HQiKO6', '2025-09-02 09:15:41', '2025-09-02 09:15:41'),
(NULL, 21, NULL, NULL, 'Fatima Faiz Kabir', 'Fatima', 'Faiz', 'Kabir', 'Student', NULL, NULL, 'FEMALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0002', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$dA/wFI1TC2U2bbTj7o/QWukj5Tj.lQL0Kuf5xeQ3bya84xyiyUhLq', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 22, NULL, NULL, 'Isham Salisu Galadanci', 'Isham', 'Salisu', 'Galadanci', 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0003', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$JF4wzf1re5s/bjx576/GBuWx5e8h0IpcRuOhENoBHAK2gSCl1/2G6', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 23, NULL, NULL, 'Salma Yusuf Maifata', 'Salma', 'Yusuf', 'Maifata', 'Student', NULL, NULL, 'FEMALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0004', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$D6ISqRXdcNiLi1aQr.c8VevlIbpUbWfk/0d/ehtEcXjwG7mBvdJQy', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 24, NULL, NULL, 'Mysha Mashood', 'Mysha', 'Mashood', NULL, 'Student', NULL, NULL, 'FEMALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0005', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$ABw2.KADMK.D1woCXf.fju5IRDA7thJD11vcUWjYtm1e0Bb.pP/X.', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 25, NULL, NULL, 'Umar Ahmad Jumaita', 'Umar', 'Ahmad', 'Jumaita', 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0006', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$xzzgx7VqxjZ./tmRFMQY9u84wUxL6AQZEjvwN2VYNmo0HaAeuxgqK', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 26, NULL, NULL, 'Nabila Farouk Jibril', 'Nabila', 'Farouk', 'Jibril', 'Student', NULL, NULL, 'FEMALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0007', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$QDrlC/K6.Qy5fjbzaVwz3.4lhV/.f/mO7QRH31CkP7Hy.H8lBEmSe', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 27, NULL, NULL, 'Abdulkadir Auwal kabara', 'Abdulkadir', 'Auwal', 'kabara', 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0008', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$r7WC/Od4Oq4YUsgZoixmWeJ8z9pFN285nRzZctXDO2GOcSqu7OMM2', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 28, NULL, NULL, 'Abdulmalik mutapha', 'Abdulmalik', 'mutapha', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0009', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$9q/3VJ/XOHj9sbt9GFHsLO2GZviFKIFlbU4KnAYYywKqEU3/JQsFG', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 29, NULL, NULL, 'Abdurahman Ahmad', 'Abdurahman', 'Ahmad', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0010', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$qzlBCyYE7r6IfrA7TT87COMvjyqkMSWVPXyLCuoAQzB8r19aX6qjq', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 30, NULL, NULL, 'Almustapha mustapha', 'Almustapha', 'mustapha', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0011', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$vXxP4Eauvv1ZKghsrwd0/Og/eKnZsgAf0AZMs07WnJGVKZE2WEgEy', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 31, NULL, NULL, 'Amal Mubarak', 'Amal', 'Mubarak', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0012', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$AuirpkHSTeniXrtdQpUwIOtuYdgUt3vrD6flF.50j.4Us1QSRGsdG', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 32, NULL, NULL, 'Abubakar Usman', 'Abubakar', 'Usman', NULL, 'Student', NULL, NULL, 'FEMALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0013', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$nQsaCgtaM2nHwqafbeNQuu0jJVjkm/r1Me5Z.0qNf2jzDT0JffIl6', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 33, NULL, NULL, 'Amaturrahman Afra Kabir', 'Amaturrahman', 'Afra', 'Kabir', 'Student', NULL, NULL, 'FEMALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0014', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$T6UaAjOu3FjtrmfOj/1hreorNbKHZfVMlIZhhOnAC5ahfv13S.DQ2', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 34, NULL, NULL, 'Rahmatullah Abubakar', 'Rahmatullah', 'Abubakar', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0015', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$uxloYMsBZ0urIajYikmgvuFTxFb/pz2GT6lYkkuck0pdeYU1hdQ3a', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 35, NULL, NULL, 'Usman Muhammad', 'Usman', 'Muhammad', NULL, 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0016', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$DmfP57/5JCPfyWLwTXqhj.lZDdV55saBymbbCd/t.ubuoEOXTIDDW', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 36, NULL, NULL, 'Ibrahim Murtala Garba', 'Ibrahim', 'Murtala', 'Garba', 'Student', NULL, NULL, 'MALE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0017', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0006', 'UPPER KG', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$8Ws9YQYf.6HGS1aIL5aWy.8B5wBQUrVERPUopQsZJkiGf62OZfyMy', '2025-09-02 09:30:22', '2025-09-02 09:30:22'),
(NULL, 37, NULL, NULL, 'ALAMIN AMINU', 'ALAMIN', 'AMINU', NULL, 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0018', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$mvnFdzycIrI4/6nFu8s16u08ARkRQB9wehy2CozAUkYwlw117PcYS', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 38, NULL, NULL, 'ALAMIN IBRAHIM', 'ALAMIN', 'IBRAHIM', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0019', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$uLjZfVUdwe/3slpHyUNNN.YwMD36MwPUfnC0cThpByMdr54oG1XU.', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 39, NULL, NULL, 'Ummu_aimana Muhammad Mustapha', 'Ummu_aimana', 'Muhammad', 'Mustapha', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0020', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$QdPwwC.WFXwYhTJmgZdGHenevcEYRXF5RsVu0RssAsPO2o/Od72..', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 40, NULL, NULL, 'Alhassan Maikudi', 'Alhassan', 'Maikudi', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0021', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$z0WserjmI9jeqtHgzfmzhumLGE.A.1oeX8aHpqeVpANaWS6FlWl9C', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 41, NULL, NULL, 'Bashir Ibrahim Bashir', 'Bashir', 'Ibrahim', 'Bashir', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0022', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$j6I4fBHZ39vkgormqoSxN..uHrPjRkGidrQbS/zviwamjpRbESHse', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 42, NULL, NULL, 'Muhammad Auwal Abubakar', 'Muhammad', 'Auwal', 'Abubakar', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0023', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$Z/dFu1j5PexgQkKjk1BFwejpFz9oUPANXfvj8DBTDaqWBqHDsEsrC', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 43, NULL, NULL, 'Rahama Kakale', 'Rahama', 'Kakale', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0024', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$6y52JL5Qpj1W0bnazvx9ReEhN5dpKGjnobDIkgXWPgUAQJKHKMxYO', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 44, NULL, NULL, 'Muhammad Kabir Ahmad', 'Muhammad', 'Kabir', 'Ahmad', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0025', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$F8K0TkElgPa/IhlncFu.MOoIus8gvC71Sf0WsLX60gIIWDH47oGPG', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 45, NULL, NULL, 'Muhammad Kamal Sarki', 'Muhammad', 'Kamal', 'Sarki', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0026', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$nafcNGmOQW1H69tFcpd/rOMU2inRhQSBNQ5peKjeC1s/o9MSvYxye', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 46, NULL, NULL, 'Muhammad Maisara', 'Muhammad', 'Maisara', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0027', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$yrCe.IFyRFONB804YziYFeWnT6fl4t5iVwTkB9Ej9M94H4F4ds7Aa', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 47, NULL, NULL, 'Rukayya Mustapha', 'Rukayya', 'Mustapha', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0028', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$hnjmGBsP8Ci.//1n1n74NOI809FzATzh7R5bR/XDzSJTMFMDneQTu', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 48, NULL, NULL, 'Farouk Usman', 'Farouk', 'Usman', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0029', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$Tt18MDIRjmBPm9bkF3RxAedjKan3vB5XlFPSywVSEqI5NniNjPLaa', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 49, NULL, NULL, 'Rukayya Shuaibu', 'Rukayya', 'Shuaibu', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0030', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$kfmntMCxE29Ri8L7iwFlluvxjlP0NovKN/.JjJR/FpQYx7x7C7kZK', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 50, NULL, NULL, 'Fatima Abdurahman', 'Fatima', 'Abdurahman', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0031', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$5Mrmm/OtEYk8CzdRF8JGTO6DO.YX/SQzDiwjtAO0Ktv.Ya8JYFuyO', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 51, NULL, NULL, 'Sadiq Abubakar Na, abba', 'Sadiq', 'Abubakar', 'Na, abba', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0032', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$hfQlOm28Iu36dfSHE6GHl.vS8kK/Y9oLy6BcmrGlThUptedVQf9WO', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 52, NULL, NULL, 'Zainab Jameel', 'Zainab', 'Jameel', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0033', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$vo21xIG4dxEVFoRHqtFp2elkRwTByGxiDvs5HZpa9DXqczDpelVYO', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 53, NULL, NULL, 'A\'isha Abubakar Maitaba', 'A\'isha', 'Abubakar', 'Maitaba', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0034', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$OhTNJU4ERgZPf4TlWp8ut.xWNGr2awTMJfg3CDRKLN6Bt4iDCeSbe', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 54, NULL, NULL, 'Zarah Kamal Sarki', 'Zarah', 'Kamal', 'Sarki', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0035', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$3HD3TdxJD1isM0M1qe7xzexMjc/VUBtzGqWfbl5jFMI8sgRX44yPS', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 55, NULL, NULL, 'Zarah Mustapha', 'Zarah', 'Mustapha', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0036', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$wkV1I6T3hmv8hxa1o2FNre7MbYOUnNTKzHTrDFmRssevXFdgwUNtC', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 56, NULL, NULL, 'Aisha Ibrahim', 'Aisha', 'Ibrahim', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0037', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$SM4AyIJsP.YPMSOcqYbjdeyLn426jNndfIxsy/m7FDTvzLlcV796y', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 57, NULL, NULL, 'Maryam Naseer Garzali', 'Maryam', 'Naseer', 'Garzali', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0038', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$eEA1VUZrcykPjnTN5qq8sODGLfMfMbI4s/pha6ssv4WrKhOkXqPye', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 58, NULL, NULL, 'Umar Bashir Umar', 'Umar', 'Bashir', 'Umar', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0039', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$4N9mnfjT4cCYuZagLIVS1.0A8/5Dt9WgozmAdaj2Wb22MxfnTeOye', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 59, NULL, NULL, 'Umar Faruq Abdulkarim', 'Umar', 'Faruq', 'Abdulkarim', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0040', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$E9WGL51xpDrmtIuRp/RiReHaFBwkBHFaaYyEI36If9xshIDgznuWm', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 60, NULL, NULL, 'Umar Sagir', 'Umar', 'Sagir', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0041', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0007', 'BASIC 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$3FC56.dAsJBr2KW6ypBWOeZPZLIubagasj1Icn9pGdhRN93rz3rou', '2025-09-02 21:15:14', '2025-09-02 21:15:14'),
(NULL, 61, NULL, NULL, 'Amina Nafiu', 'Amina', 'Nafiu', NULL, 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0042', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$s2xCU7Ydz6QE6aJI3iDtresLMMbfQ/oevz0wS0NC9gRKzM1iV2T7O', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 62, NULL, NULL, 'FATIMA HASSAN', 'FATIMA', 'HASSAN', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0043', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$/xlRzENH0HCuUhCR9QDMmuK7aAHqeRIfjQX2RfT8faY0l8425sXMC', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 63, NULL, NULL, 'FATIMA SALISU', 'FATIMA', 'SALISU', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0044', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$xy1zRh/WC6oaAyjqgHDdH.Ne1cmI846Z/EfhKdb0MM8Fs8lC8T4zG', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 64, NULL, NULL, 'ABDULKADIR ALIYU', 'ABDULKADIR', 'ALIYU', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0045', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$6DGEjguLPI1UoB5x36b5iuToWTF8r9z.3S8x/u0ReFWa8TvYJ4F7i', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 65, NULL, NULL, 'AISHA SAMANI', 'AISHA', 'SAMANI', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0046', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$bKydnaQ.nn7kcH.4m95iY.Z.H6oe6qAI4cs4x3hy6OK8L/jAUQZS.', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 66, NULL, NULL, 'AISHA SURAJ BELLO', 'AISHA', 'SURAJ', 'BELLO', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0047', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$lX61RJDmNanStm41zPFtI.6wvYPdxxcjGIE0srM7K2aeg8UJrayaK', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 67, NULL, NULL, 'MUHAMMAD AMINU HAMZA', 'MUHAMMAD', 'AMINU', 'HAMZA', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0048', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$zebkeng6SB5J7ZoaFThcDur.fmtk6flkXYw4Uvkf8NJlXSfnXaoNa', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 68, NULL, NULL, 'MUHAMMAD KABIR', 'MUHAMMAD', 'KABIR', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0049', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$mF4ph45aDoNBUgwxrY289uTlSPYLb8fW4ajOpwBqnnrvRt4Y0xcD6', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 69, NULL, NULL, 'AMAL KABIR', 'AMAL', 'KABIR', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0050', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$QfZ1d4x1ZKuS/4S6xqVgPuUr/SVzkhyLTz3pOL4Al0Cie9zJc.3ZK', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 70, NULL, NULL, 'USMAN AHMAD', 'USMAN', 'AHMAD', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0051', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$9afRTccjT3E5PLVzHe/p/uCBbyJkQwR1A9JiVvPaEHWuOOjExCNx.', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 71, NULL, NULL, 'Hindatu Muhammad', 'Hindatu', 'Muhammad', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0052', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$te4qQ9gqw7krjNbtQxJZBerqY7Fcu78toPDEKLn1IJ4q32g80sBFa', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 72, NULL, NULL, 'AMINA MAISARA', 'AMINA', 'MAISARA', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0053', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$ry2/yoBqeUh8QvPdQ67LmuOBc9fyunRbceuziWN9oZgcSXUEob2Ge', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 73, NULL, NULL, 'FATIMA AYUBA', 'FATIMA', 'AYUBA', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0054', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$LwOGTJvM5Ai5PFKb2QIXD.7oiRdRZFpflA120BT3AokRL/sm30GA.', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 74, NULL, NULL, 'AMINA SANI', 'AMINA', 'SANI', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0055', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0008', 'BASIC 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$UJReJzW92b3ES3OvQMoSxOeNOwmj7tF.pqPIOgKRlmPtPf7KuHKs2', '2025-09-02 21:23:44', '2025-09-02 21:23:44'),
(NULL, 75, NULL, NULL, 'ZAINAB SURAJ BELLO', 'ZAINAB', 'SURAJ', 'BELLO', 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0056', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$6xw.CChqTsgQkOREkTEUEeIcjTVpCAukZ//quhdx0qru3PuTl3IeG', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 76, NULL, NULL, 'ISMA\'IL AHMAD', 'ISMA\'IL', 'AHMAD', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0057', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$vxHEfzyQ87XgFcQgS0q1AOgwgK1Xqyl2rxzqTvIuYiwTfrZkLQbl6', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 77, NULL, NULL, 'AMINA USMAN ABBA', 'AMINA', 'USMAN', 'ABBA', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0058', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$YtAs9GSiZh/YsWI0C4i8CO6zPReMuceDkqYI/yt6pG9of9RPF5etq', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 78, NULL, NULL, 'KAMAL KAMAL SARKI', 'KAMAL', 'KAMAL', 'SARKI', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0059', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$Y0tPkqy4HVHht9YzCsbyMuRI7IQCd8ZvNFhYqjYqAd8.m4zZETfIW', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 79, NULL, NULL, 'UMAR MUBARAK', 'UMAR', 'MUBARAK', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0060', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$BRqc0.V7WaQGUYcF9vc0meLW9yyGqNIisYV032ZimJDe3aIKe8Vv2', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 80, NULL, NULL, 'FATIMA YUSRA MUAZ', 'FATIMA', 'YUSRA', 'MUAZ', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0061', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$IUfCg8PhcbWdl.6a3OG7PuG5MBauJBaKeAy54O1psAv0zNf3VtSbq', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 81, NULL, NULL, 'KHADIJA KABIR BELLO', 'KHADIJA', 'KABIR', 'BELLO', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0062', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$qr182b193f9GRcomGftUpeuTDV9fm1pkYE.5/c9BYMRM7IfjDuTd.', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 82, NULL, NULL, 'ABDULLAHI YAHAYA MARZUQ', 'ABDULLAHI', 'YAHAYA', 'MARZUQ', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0063', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$uMMhsq2UlK.58ehp7N4qeu2E4sgbEBt7r76CZoW8aSJJpTD66twLK', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 83, NULL, NULL, 'ABDULLAHI YUSUF MAIFATA', 'ABDULLAHI', 'YUSUF', 'MAIFATA', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0064', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$0M8nD0hguoL4EC.sRMI6ZeDTY6QVGamoNrnIOVAln/yLxLBXH/iP6', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 84, NULL, NULL, 'ABDULMALIK AYUBA MUHAMMAD', 'ABDULMALIK', 'AYUBA', 'MUHAMMAD', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0065', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$Rm0AWIZQAlLZg/RKz4IMge0Cu2Wl.Mhz6I6btLUhdUx6uQnBvAAqi', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 85, NULL, NULL, 'UMMULKAIRI MUSA DANKOLI', 'UMMULKAIRI', 'MUSA', 'DANKOLI', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0066', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$hVIqQOE0MOufIqXepUwZ5./uWA5TeDnzg3M42KVTXLtIEnYofeVc6', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 86, NULL, NULL, 'ABDUSSALAM USMAN', 'ABDUSSALAM', 'USMAN', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0067', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$VumWJM/eXq7tlfxK31MdTOpki/4R0s13GMZT7rRHivnLZ4AsoGRai', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 87, NULL, NULL, 'Khalid Abdulkareem', 'Khalid', 'Abdulkareem', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0068', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$aoIkmKyrmj3c3jfjGwFKY..jTEo676SQBzoOA04V058nn2GRODy5i', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 88, NULL, NULL, 'RUKAYYA IBRAHIM NUHU', 'RUKAYYA', 'IBRAHIM', 'NUHU', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0069', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$lPAgzoRxL.7gyhf702uLfOS5qKdvyvN33zJ5ojpQ8GeIqs8g4GD5e', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 89, NULL, NULL, 'ADIL ISAH KHALIL', 'ADIL', 'ISAH', 'KHALIL', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0070', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$bbntKbg316bnetJqHFYpeO8o9S.sP5RTd6bqOx2qjBjAcf2ZHO08S', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 90, NULL, NULL, 'HAUWA KABIR', 'HAUWA', 'KABIR', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0071', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$4xdi1ajTbxeHvpmb6YRCWOslBm7xbPx9yBcZKpJovcXymfJuJAvnm', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 91, NULL, NULL, 'MUHAMMAD MUHAMMAD KWANKWASO', 'MUHAMMAD', 'MUHAMMAD', 'KWANKWASO', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0072', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0009', 'BASIC 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$CiZodvz2OemPeDYyGurObuQBj8CO8EyI/FbBgTXdn7aP2MB.3fTVu', '2025-09-02 21:24:44', '2025-09-02 21:24:44'),
(NULL, 92, NULL, NULL, 'Mukhtar Shuaibu', 'Mukhtar', 'Shuaibu', NULL, 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0073', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$kPAjWft6JOHSaCn0Dhu7qejh9rV4DepOjxRfLGluqpvNymg0vj6t2', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 93, NULL, NULL, 'Aisha Ahmad Salis', 'Aisha', 'Ahmad', 'Salis', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0074', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$4IeHI/ve8nLQWgMdjlhAWuTBf7VI9cWNYJQDdmtglxicwEFS2B/PO', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 94, NULL, NULL, 'Sadiq Sagir Garba', 'Sadiq', 'Sagir', 'Garba', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0075', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$3zADXquYasrejC.PnqjLeOWIKqTXqaFhmfAgw2eBzWOuwG5.OgxGm', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 95, NULL, NULL, 'Aisha Muhammad', 'Aisha', 'Muhammad', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0076', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$G4.sutPU955W1EIjwNylo.A5iS/Ps5w2G4DLCEjpcSMd.t3AjZDrC', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 96, NULL, NULL, 'Khadija Usman', 'Khadija', 'Usman', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0077', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$NwLsX.IWp2pA68CLREk0Gut.YWCXEoPiVUqgwefxaP65DQNNnUvRW', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 97, NULL, NULL, 'Rabia Bashir Ibrahim', 'Rabia', 'Bashir', 'Ibrahim', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0078', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$ihJ4XGpM1q4O8Ed/7MS/qO9BLRNc0eKJ0MZSvotVZVl1U.PRGXdL2', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 98, NULL, NULL, 'Hauwa Abdurrahman', 'Hauwa', 'Abdurrahman', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0079', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$400pVg8j1GFY4eKuVFetTOV7Bx7VCnIElgMkH6Xlic0nYdmFzM0Wa', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 99, NULL, NULL, 'Hauwa Hamza Kwa', 'Hauwa', 'Hamza', 'Kwa', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0080', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$kHtuFyVG/Hiig37PUQ5EYOOGGxy5DisbZTSgastqxIUcD6QH8.mZO', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 100, NULL, NULL, 'Yahaya Marzouq', 'Yahaya', 'Marzouq', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0081', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$phMLlXvwus/JKOkR5Bo1Ue86qXxVwwylqhGjYOIX952eVeVzul2Fu', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 101, NULL, NULL, 'Ahmad Kamal Sarki', 'Ahmad', 'Kamal', 'Sarki', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0082', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$06o7KQHrrWfszEPMwqBELeiIHbroUJ76pC85iO.2j7iHOMEYykrJC', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 102, NULL, NULL, 'Muhammad Mubarak', 'Muhammad', 'Mubarak', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0083', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$SbplEApDwzzl.G96QLsWieD/1MR4VPKmho.z7chX4DAgzmjQcEl56', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 103, NULL, NULL, 'Amina Murtala', 'Amina', 'Murtala', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0084', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$zRAZMbfXfwF1kdFBZSiGcupQbeP/GsCzws1NompulW6kSRTrZ.A4e', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 104, NULL, NULL, 'Maryam Ahmad Baba', 'Maryam', 'Ahmad', 'Baba', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0085', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$8GCOpvmPswubWpLeisSsZOqTMb9UWUi0Qck2D6C3lmSahnOGvZ7E.', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 105, NULL, NULL, 'Mukhtar Shuaibu', 'Mukhtar', 'Shuaibu', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0086', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0010', 'BASIC 4', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$FSdtCfCsEoSO9Lz0Q1Tem.OWNEoKT2eOA/gk5p9jTaBUwVZ4csYaO', '2025-09-02 21:51:15', '2025-09-02 21:51:15'),
(NULL, 106, NULL, NULL, 'HABIBA LABARAN', 'HABIBA', 'LABARAN', NULL, 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0087', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0011', 'BASIC 5', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$unL3sgzLfKZpdL8TymhBDOMIin5MvFZKWw2arkk4A64GM13S8BP5a', '2025-09-02 21:53:30', '2025-09-02 21:53:30'),
(NULL, 107, NULL, NULL, 'HAFSAT KABIR KAKALE', 'HAFSAT', 'KABIR', 'KAKALE', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0088', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0011', 'BASIC 5', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$QVTW/Y50vmajR6nh1AVFAuy1NO8ZsC7qFPAiF3kPhQGazy/RXk.m.', '2025-09-02 21:53:30', '2025-09-02 21:53:30'),
(NULL, 108, NULL, NULL, 'ABUBAKAR MUBARAK', 'ABUBAKAR', 'MUBARAK', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0089', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0011', 'BASIC 5', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$VszesDc4s3cncmipfeUsW.Nf6Xjcju/Sr91opSEtIXGwpQvAlHHz.', '2025-09-02 21:53:30', '2025-09-02 21:53:30'),
(NULL, 109, NULL, NULL, 'ABUBAKAR SURAJ BELLO', 'ABUBAKAR', 'SURAJ', 'BELLO', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0090', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0011', 'BASIC 5', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$nCMrV5uudcSrTtOuQgiEBeyqgJ1hspWeiLIZ1RJDY3llRSXvTbwVq', '2025-09-02 21:53:30', '2025-09-02 21:53:30'),
(NULL, 110, NULL, NULL, 'RAHINAT KABIR', 'RAHINAT', 'KABIR', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0091', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0011', 'BASIC 5', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$S9T8DykYurPTFThENrAfKeaIA6eWoDkgOpVFx1BfdW/eWB0JgpQ86', '2025-09-02 21:53:30', '2025-09-02 21:53:30'),
(NULL, 111, NULL, NULL, 'USMAN AMINU BALA', 'USMAN', 'AMINU', 'BALA', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0092', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0011', 'BASIC 5', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$E6P/J05DR9Vq.zNLWCk//OGTigAPpsyOhybMrS7TarJ6UuOdnK.Iq', '2025-09-02 21:53:30', '2025-09-02 21:53:30'),
(NULL, 112, NULL, NULL, 'FAROUK MUSTAPHA', 'FAROUK', 'MUSTAPHA', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0093', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0011', 'BASIC 5', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$6htDRGXMi2zJYubmAIVdje/Q0zRcU2hmXl.OCkq5dlVcEILhij4l6', '2025-09-02 21:53:30', '2025-09-02 21:53:30'),
(NULL, 113, NULL, NULL, 'ISAH ABDULKADIR', 'ISAH', 'ABDULKADIR', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0094', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0011', 'BASIC 5', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$IBBxWWpZzMQTehJ1bU4W4Ob7./nI6VC9IbQF9KEdnmQ4GUDeKlaKi', '2025-09-02 21:53:30', '2025-09-02 21:53:30'),
(NULL, 114, NULL, NULL, 'Zulaiha Mu\'az', 'Zulaiha', 'Mu\'az', NULL, 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0095', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$4WrhGdUFD8bG1EyG.qzMWO1x/V5kIaXWMXLyNMBuXx/u0WGFs6KIW', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 115, NULL, NULL, 'Ummakulsum Sadiq', 'Ummakulsum', 'Sadiq', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0096', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$DN37S8mvCYDzvbA8bTO/Xu1GwuHz/Lcr0RbOK22phF0r4wn9c1eJa', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 116, NULL, NULL, 'Muhammad Ahmad', 'Muhammad', 'Ahmad', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0097', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$NrU0XBgMJO3PUx7YFujiu.CdtrhBwm.Nf9lNgpUlz4kKlYwMKB..C', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 117, NULL, NULL, 'Ayman Muhammad', 'Ayman', 'Muhammad', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0098', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$.GDuRl6z5HAjIBNG3JZIaeKTIR594ofcNvNG0s5JW2GvuQ2bGl8T.', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 118, NULL, NULL, 'Habibullah Mustapha', 'Habibullah', 'Mustapha', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0099', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$2o6SN9kUE2dnf7XMnG0EPO/7kl5gzP08YbDa4sfqe55EXJyQthqL.', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 119, NULL, NULL, 'Banazir Jameel', 'Banazir', 'Jameel', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0100', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$9HCZHuo4n4lw3pquXFfKa.IJmHl4PB8egoNt/wFq2yxX2UI7T/bNO', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 120, NULL, NULL, 'Amina Abdurrahman', 'Amina', 'Abdurrahman', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0101', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$aXJe8mo09ij/wzlz/dMku.CMALHMlZMQxD/nog.VKCrodv6n6GIeS', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 121, NULL, NULL, 'Muhammad Mubarak', 'Muhammad', 'Mubarak', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0102', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$QYKCbFZU3J.88n8lm6NEvO2K6.M/NpwxLX4XrwThxMiB1CUKQ4OpK', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 122, NULL, NULL, 'Sa\'adatu Musa', 'Sa\'adatu', 'Musa', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0103', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$pTb9yc0TPDNMzrLWP9bg6exLyNaf39O7QFdxqn1JQbtemicJYRG4W', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 123, NULL, NULL, 'Rahma Aminu Sabo', 'Rahma', 'Aminu', 'Sabo', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0104', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$OYZN0RQyyIJ7kMcQNVw92.DNum0/VlTGkofl2qiMtH/ctOBNiCTfG', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 124, NULL, NULL, 'Mahmud Aminu', 'Mahmud', 'Aminu', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0105', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$zYHqANmX0.FtzLkOiOZuUudEyx8h0y.EkFz2r/Nup7Niz00lsPm/a', '2025-09-02 21:59:29', '2025-09-02 21:59:29');
INSERT INTO `students` (`app_id`, `id`, `parent_id`, `guardian_id`, `student_name`, `surname`, `first_name`, `other_names`, `user_type`, `home_address`, `date_of_birth`, `sex`, `religion`, `tribe`, `state_of_origin`, `l_g_a`, `nationality`, `last_school_attended`, `special_health_needs`, `blood_group`, `admission_no`, `admission_date`, `academic_year`, `status`, `section`, `mother_tongue`, `language_known`, `current_class`, `class_name`, `profile_picture`, `medical_condition`, `transfer_certificate`, `reason`, `branch_id`, `school_id`, `password`, `created_at`, `updated_at`) VALUES
(NULL, 125, NULL, NULL, 'Fatima Ahmad Salis', 'Fatima', 'Ahmad', 'Salis', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0106', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0012', 'BASIC 6', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$9pRunA7dKlgxlYZAIVZFfugSylf6olfrudS27xGce0B7G22nHm/56', '2025-09-02 21:59:29', '2025-09-02 21:59:29'),
(NULL, 126, NULL, NULL, 'Maryam Kakale', 'Maryam', 'Kakale', NULL, 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0107', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0013', 'JSS 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$93sX46gsEA3higzzsC96zeJL9ZmIUVl5b9QQqFUZOPZTmfL58yjq.', '2025-09-02 23:16:58', '2025-09-02 23:16:58'),
(NULL, 127, NULL, NULL, 'Abdallah Mustapha', 'Abdallah', 'Mustapha', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0108', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0013', 'JSS 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$AK7it.cwv6Xi/M38TCfAhu9MQqSc2dU2HCSPgl9iEFXuSd6YoJLfS', '2025-09-02 23:16:58', '2025-09-02 23:16:58'),
(NULL, 128, NULL, NULL, 'Arfah Muhamad', 'Arfah', 'Muhamad', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0109', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0013', 'JSS 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$xuyzD.1K8YnfhwEu8aoOzuLNnPLeJy5gSg4DcMSSZd9suIF8f0p4.', '2025-09-02 23:16:58', '2025-09-02 23:16:58'),
(NULL, 129, NULL, NULL, 'Ghali Hamza', 'Ghali', 'Hamza', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0110', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0013', 'JSS 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$n1eyTaLQBzIKUcy4veTsF.bwNm9bQGv5jSOrgpvuxh6UtiMKQDhzu', '2025-09-02 23:16:58', '2025-09-02 23:16:58'),
(NULL, 130, NULL, NULL, 'Khadija Kamal Sarki', 'Khadija', 'Kamal', 'Sarki', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0111', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0013', 'JSS 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$Yuxftk0lviORNRtSOhf/hekxKYgbrkfx5d3w6BFsZVO59cwKfFLRC', '2025-09-02 23:16:58', '2025-09-02 23:16:58'),
(NULL, 131, NULL, NULL, 'Khalid Ahmad', 'Khalid', 'Ahmad', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0112', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0013', 'JSS 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$AzL0MhoNOt4.qpg9K0wgLuOVQoEzHPzbNVMCYsTCtveXbR9NDd10K', '2025-09-02 23:16:58', '2025-09-02 23:16:58'),
(NULL, 132, NULL, NULL, 'Ummussalma Muhammad', 'Ummussalma', 'Muhammad', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0113', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0013', 'JSS 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$XDS9qWv7ub/OJFbMGNgCnuoo9tmXkKBqXsyU9.S3jUVHWkZAGOzfi', '2025-09-02 23:16:58', '2025-09-02 23:16:58'),
(NULL, 133, NULL, NULL, 'Usman Abdulsalam', 'Usman', 'Abdulsalam', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0114', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0013', 'JSS 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$HaZoYlIKBBYn04y7Bq6qFe7rommCBWFXZ7EenQqv3mKWLNlBAepzS', '2025-09-02 23:16:58', '2025-09-02 23:16:58'),
(NULL, 134, NULL, NULL, 'Aisha Abubakar', 'Aisha', 'Abubakar', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0115', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0013', 'JSS 1', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$CZqa5uZa7t6CHjcgnvv1mO/4tu.oe9mIL2LdXWqzCTa6ehDYMQ.Ba', '2025-09-02 23:16:58', '2025-09-02 23:16:58'),
(NULL, 135, NULL, NULL, 'Musa Ahmad', 'Musa', 'Ahmad', NULL, 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0116', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$ZTJO8.NwdzE6ZKOd6oylH.DVnelmH3JscTafPbvfrk1aF/OcYqbEq', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 136, NULL, NULL, 'Fatima Sani', 'Fatima', 'Sani', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0117', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$U5lGxL1A72s.c461akEnjuWCFuDGAeqm9ROpe5RYqfIRejMazDpQ.', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 137, NULL, NULL, 'Khadija Aliyu Sallau', 'Khadija', 'Aliyu', 'Sallau', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0118', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$gVwq3H3z0jYJvXL6mcNKOeEiPd2Buvh71B6Zi1HH3QvsjBJRIrcGq', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 138, NULL, NULL, 'Muhammad Abubakar', 'Muhammad', 'Abubakar', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0119', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$VmThhfKdbTGjEuFNkYWnBOW.cqdsdH4RH8cO25MRV9OVN6szt7msO', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 139, NULL, NULL, 'Ummulkairi Abdullah', 'Ummulkairi', 'Abdullah', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0120', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$FAo8v.N0hD2Mc1IzGQiPH.mu3X8iWReI4Bb6UzxV8V7x2q/WuBjqi', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 140, NULL, NULL, 'Aliyu Abdul', 'Aliyu', 'Abdul', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0121', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$ub8LpT5.X/38DmLdS0fJPueCttrvPd5b1/F4rdhjxz6xtxzGkHRca', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 141, NULL, NULL, 'Aliyu Abdullah', 'Aliyu', 'Abdullah', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0122', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$0fY2o2jEjkTRCctcADcmyOmZeKZ5FKregHHX3XY1Pkgvhn1VEQhay', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 142, NULL, NULL, 'Bashir Isyaku', 'Bashir', 'Isyaku', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0123', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$04B4Mn8g1x0gpC09h7osM.TXWSJHRh2599fWvtgKX.apUPcxLn2dC', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 143, NULL, NULL, 'Hajara Sadiq', 'Hajara', 'Sadiq', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0124', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$ItqS0lMHpODxzehQOaS33u/5nZ1k8ijQ2euQbmHt4Qm1JwS/AQK5m', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 144, NULL, NULL, 'Buhari Umar Adamkolo', 'Buhari', 'Umar', 'Adamkolo', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0125', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$aaNEgzrnr0AtpLizwOkTkOaBZQNexV69NEBkNsAYSX2pLRj6887Ue', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 145, NULL, NULL, 'Khamis Yusuf Garba', 'Khamis', 'Yusuf', 'Garba', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0126', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$dEXAEtXFMY0ZAivQkE5k2.JqhP1dBTmzoWkxFTnr3G5pqPJWDSkfe', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 146, NULL, NULL, 'BUHARI UMAR ADAMKOLO', 'BUHARI', 'UMAR', 'ADAMKOLO', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0127', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$Ljpluks5gsHHIdaCygNneuqYCfv2GOPqwfmahJ46lMwjpujqClGr.', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 147, NULL, NULL, 'Maimuna Ibrahim', 'Maimuna', 'Ibrahim', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0128', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$KK5ntXBNW3lKh2GP05Ba/uFbkimfQVkGBe5TGjlOdI5KxZt1mKhTu', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 148, NULL, NULL, 'Fatima Habib', 'Fatima', 'Habib', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0129', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0014', 'JSS 2', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$UhXtr8B9lX39IjFoWHPiUudn9o0Y/GtScX3FZW36gdd85LGQPPG2S', '2025-09-02 23:18:36', '2025-09-02 23:18:36'),
(NULL, 149, NULL, NULL, 'Aisha Aminu', 'Aisha', 'Aminu', NULL, 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0130', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0015', 'JSS 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$LJnKaPkSdwFNZo.5QffIruZw5LvxbUrEXSs.1BTDpsrqOoE70W2rC', '2025-09-02 23:19:35', '2025-09-02 23:19:35'),
(NULL, 150, NULL, NULL, 'Aisha Ibrahim', 'Aisha', 'Ibrahim', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0131', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0015', 'JSS 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$K3AyZP8zuTpp8vlCC4bhs.9widyWTE/IeVEp7lraQcX5kTLxMLv.m', '2025-09-02 23:19:35', '2025-09-02 23:19:35'),
(NULL, 151, NULL, NULL, 'Muhammad Aliyu Sisa', 'Muhammad', 'Aliyu', 'Sisa', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0132', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0015', 'JSS 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$ZrXpuEaj4tqcDYqfJyR7DeO46.f19yjV1wzqTv1WJQALGlWfIch/O', '2025-09-02 23:19:35', '2025-09-02 23:19:35'),
(NULL, 152, NULL, NULL, 'Bilal Aminu Sabo', 'Bilal', 'Aminu', 'Sabo', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0133', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0015', 'JSS 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$slK.P/.wFpZKDqBiVhCb2ubZBhoUS5BZ5B.CZF18IZc6gm4bdtgiK', '2025-09-02 23:19:35', '2025-09-02 23:19:35'),
(NULL, 153, NULL, NULL, 'Muhammad Mansur', 'Muhammad', 'Mansur', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0134', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0015', 'JSS 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$8WK7H7XjOboR6fK0xBdGbuXzR7PZ2x3YQkMQxmTmOP.RQ526kKWPq', '2025-09-02 23:19:35', '2025-09-02 23:19:35'),
(NULL, 154, NULL, NULL, 'Amina Abubakar', 'Amina', 'Abubakar', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0135', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0015', 'JSS 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$MOgvWrnw2yRW2wFi/7UKAeTLuQ6p2xA0XPGQqbtZThEb/CD.0oFxC', '2025-09-02 23:19:35', '2025-09-02 23:19:35'),
(NULL, 155, NULL, NULL, 'Mariya Hussain Khalid', 'Mariya', 'Hussain', 'Khalid', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0136', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0015', 'JSS 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$twYNwbO3N9rr7xHHP/BGQOJJw6G377xxgPmgA7XbDmiNqz/YqX1Ru', '2025-09-02 23:19:35', '2025-09-02 23:19:35'),
(NULL, 156, NULL, NULL, 'Zainab Kabir', 'Zainab', 'Kabir', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/1/0137', NULL, NULL, 'Returning Student', 'JUNIOR SECONDARY', NULL, NULL, 'CLS0015', 'JSS 3', NULL, NULL, NULL, NULL, 'BRCH00011', 'SCH/10', '$2a$10$C59zbs1Fhom5Dqg01bPcBuKT4uPtUDg/1VqDTP49btwn4P8lL9bu6', '2025-09-02 23:19:35', '2025-09-02 23:19:35'),
(NULL, 157, NULL, NULL, 'Islam Jamil', 'Islam', 'Jamil', NULL, 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0001', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$IeOeuMpo0en.eBJuDfzJ/uUJg3rOjLD1IYAobN65AWFlU5MMVe3IK', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 158, NULL, NULL, 'Muazzam Hassan', 'Muazzam', 'Hassan', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0002', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$FZvNYYqT/NVsYWHWzAiREuDsOTmlJnC0k9fu3Xl.JVBDjv9XEltLG', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 159, NULL, NULL, 'NABILA FAROUQ JIBRIL', 'NABILA', 'FAROUQ', 'JIBRIL', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0003', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$cINL5NsTaoFqBMARNGIJlOyO4tNRmIxD970gxEerhcEn8q510nPKm', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 160, NULL, NULL, 'Khadija Aliyu Usman', 'Khadija', 'Aliyu', 'Usman', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0004', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$Y5peftd6/VWrJ.qW2de9e.nbVJBTOtvSS71YO5I5057sXLoOigM1a', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 161, NULL, NULL, 'Nasir Hussain Khalid', 'Nasir', 'Hussain', 'Khalid', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0005', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$.4J.4DDIsgkQ7gBOLOyek.Vskose7AwFlOUcjCVxvPhWEc/driVue', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 162, NULL, NULL, 'Habiba Saminu', 'Habiba', 'Saminu', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0006', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$Q0PfvHYok8gkXBedykBWYuKGf2n1bGGvhxPgkeldiRLgQ6OJHtLyW', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 163, NULL, NULL, 'Bilkisu Abubakar', 'Bilkisu', 'Abubakar', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0007', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$yLwVrMVUNrRE6oMkpgel8O9UOgODaUfwkt9PUq5rFSuQo0N2EMXzu', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 164, NULL, NULL, 'Amaturrahman Afrah Kabir', 'Amaturrahman', 'Afrah', 'Kabir', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0008', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$JneSr1RpmsQ7xsSz2pyaNOULryKvhu6peggveVec.i2HcKcFX.fU2', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 165, NULL, NULL, 'Fadima Usman', 'Fadima', 'Usman', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0009', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$vJOcoRUxZh21Sh0mV1E4uOzi.w6ZE6qmf8oQeWOySt/90F1RRG3Da', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 166, NULL, NULL, 'Ahmad Alkasim', 'Ahmad', 'Alkasim', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0010', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$MCkKZjMhH3TM6sWqK9Lm8.VM5FuHdnfuDvaekRwQ0QcmsgCNh8j8y', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 167, NULL, NULL, 'Zainab Hassan', 'Zainab', 'Hassan', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0011', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$GzZYFJHCKWd3FAKqMxKABO4QCjd8ZKqW1cL20s4URRICab4THmOKa', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 168, NULL, NULL, 'Amina Kabeer', 'Amina', 'Kabeer', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0012', NULL, NULL, 'Returning Student', 'NURSERY', NULL, NULL, 'CLS0024', 'UPPER KG NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$2mASKi/ruQHVT/ZE9it4kubHLlRquA5s1q9h6c0WQShGscNkcL7/a', '2025-09-02 23:39:40', '2025-09-02 23:39:40'),
(NULL, 169, NULL, NULL, 'SHAMSUDDINYUSUF YUSUF GARBA', 'SHAMSUDDINYUSUF', 'YUSUF', 'GARBA', 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0013', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0025', 'BASIC 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$FGP4bW65UZVrKfMdMNey9.WgKFD/EJK7p.sBb7AjqroKDe18WLyNO', '2025-09-02 23:49:05', '2025-09-02 23:49:05'),
(NULL, 170, NULL, NULL, 'Shamsudeen Yusuf', 'Shamsudeen', 'Yusuf', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0014', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0025', 'BASIC 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$AlO6FnVuo2nWjwr8DiSTg.rlbyNmWcewLQdK5zVtL5DSZyXcx15YC', '2025-09-02 23:49:05', '2025-09-02 23:49:05'),
(NULL, 171, NULL, NULL, 'Zara Richard', 'Zara', 'Richard', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0015', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0025', 'BASIC 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$japvAfUqLocVfFTaWTj5eeHlPeAccU2dFmqoSg2L7K.fRLjaQqEhW', '2025-09-02 23:49:05', '2025-09-02 23:49:05'),
(NULL, 172, NULL, NULL, 'KHADIJA USMAN', 'KHADIJA', 'USMAN', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0016', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0025', 'BASIC 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$tlebIzL2ysY/H.OSXOqrAOsn2dzLzB5GE2RcmZd7zX2WsT9h6tZVu', '2025-09-02 23:49:05', '2025-09-02 23:49:05'),
(NULL, 173, NULL, NULL, 'MUHAMMAD MUSTAPHA BAKO', 'MUHAMMAD', 'MUSTAPHA', 'BAKO', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0017', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0025', 'BASIC 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$5allQ4TOBGHOdR5BpYd9leClB85XEgjIGjJ8cJjTbw/4pHPZU7fqq', '2025-09-02 23:49:05', '2025-09-02 23:49:05'),
(NULL, 174, NULL, NULL, 'Saleh Ibrahim Abdullahi', 'Saleh', 'Ibrahim', 'Abdullahi', 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0018', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$Wosnuk.rRUN/dABzVPHhAes4R1SX3mgB2KZ5TZ18LuS50ekJ8b67G', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 175, NULL, NULL, 'Zainab Murtala Yahuza', 'Zainab', 'Murtala', 'Yahuza', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0019', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$JF4BAOQuqQ9qCCB4cn52Su3uN5AUakauV3TlMvi5aW6/QG6CWWgwa', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 176, NULL, NULL, 'Maryam Mustapha', 'Maryam', 'Mustapha', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0020', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$19pij7CJyeNHMo4osXTSFunxalCq3i5SQUQN/5.hijMKBKHY8mxoa', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 177, NULL, NULL, 'Mubasshir Mustapha', 'Mubasshir', 'Mustapha', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0021', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$5X6y84ycydiAuytbug2bveFlsxtCf0Qd.gcNL.UvQEb/krxBgKTy2', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 178, NULL, NULL, 'Fatima Yusuf Garba', 'Fatima', 'Yusuf', 'Garba', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0022', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$3UmOofKdfjCD6vYtKfLO8uSBUbwhdKu/e7V4jg9.TEdGfcRxJB24i', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 179, NULL, NULL, 'Abdussamad Usman Abdurrahman', 'Abdussamad', 'Usman', 'Abdurrahman', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0023', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$1qwy/hONXi/pUE9LwJitvuAGvMmMCWSkv98eQaCaF9fFWB0UUnSjC', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 180, NULL, NULL, 'Abubakar Ibrahim', 'Abubakar', 'Ibrahim', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0024', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$xaeKzH3nMrhfm2ZtITV1U.AQSYf/WJECM1dSonYRyo0E/JgxLFHYq', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 181, NULL, NULL, 'Khalid Hussain Khalid', 'Khalid', 'Hussain', 'Khalid', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0025', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$.bzCBkTILwrBFlX8ctEIBeYBpZXkz94B48IvmaRur9RpQ9ANqaIsK', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 182, NULL, NULL, 'Adams Musa Adams', 'Adams', 'Musa', 'Adams', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0026', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$9xaI7Dlk5yveCAQhXxmhSOdkRHHUz/QlOiGKofXBV9u0tqtCzjDU2', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 183, NULL, NULL, 'Hauwa Murtala Yahuza', 'Hauwa', 'Murtala', 'Yahuza', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0027', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$2M7GAyTwJh50GRU80Y6rnO66WZhmuue6m1eeKxsQdTdCDD2YDTPYC', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 184, NULL, NULL, 'Fatima Abubakar', 'Fatima', 'Abubakar', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0028', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$iw9kHag2Gi0jJk0q6Yy1l.yu2E.XU/pe/GKw75xHJjjptYNRPBeX.', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 185, NULL, NULL, 'Ahmad Usman', 'Ahmad', 'Usman', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0029', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0026', 'BASIC 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$XPg89N.dSKxi.qUIM/MTruGOO3wnulrCxau6s80mlW8htelt8pnf.', '2025-09-02 23:49:20', '2025-09-02 23:49:20'),
(NULL, 186, NULL, NULL, 'Zainab khalid hussain', 'Zainab', 'khalid', 'hussain', 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0030', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$bPpCKYVrp83/TkixTCjureGJggEm4yeaat0Hncs2Q3jaSOX4Bon9i', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 187, NULL, NULL, 'Amina Sultana Kabir', 'Amina', 'Sultana', 'Kabir', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0031', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$k1Byb6deNYZbl1VV8oBS9u1./0ar3hKVcUPcVS8rLTbcVoSRNObga', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 188, NULL, NULL, 'Abdulahad usman', 'Abdulahad', 'usman', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0032', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$MF.ov2.XRFE6BjcmbVSjXOlguppZmf2gowyl0vG2943Gdkz47zUKS', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 189, NULL, NULL, 'Najib Aliyu', 'Najib', 'Aliyu', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0033', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$QvnNKUAH8ha2.KIVc9nGce4ASU5lyOe9oUYlOdQvAgdWFyl.Cli8C', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 190, NULL, NULL, 'ASMAU USMAN ABDULLAHI', 'ASMAU', 'USMAN', 'ABDULLAHI', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0034', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$mIHFG9Bbjipj6v.XwMI1We57ft/qq1JLLjoRZQrQGi3F4oDsf2Ak2', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 191, NULL, NULL, 'Aliyu Aliyu', 'Aliyu', 'Aliyu', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0035', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$j/W6S7X5ehCqbGXiw/KXtOUm4urE1LUMLHiXVAw859fskhWMWZaIm', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 192, NULL, NULL, 'Aliyu Yusuf Karaye', 'Aliyu', 'Yusuf', 'Karaye', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0036', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$f5AcSy5olk4o8Cp4yAvnVuMUVKmgErVONqD0vqe8/2l6qS4k8sCdO', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 193, NULL, NULL, 'Hassan ibrahim', 'Hassan', 'ibrahim', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0037', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$/b8RWGK6gVhX/APNcM9WreCMbtT1hBk/YA/p4IPUPYormW0mGgagS', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 194, NULL, NULL, 'Ameena Amira Kabir', 'Ameena', 'Amira', 'Kabir', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0038', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$lRG6U7aS25ES5bW61Hx3KeOQqRzaKacXLHT98lGhMJvAPLqCaI2Q6', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 195, NULL, NULL, 'Yusuf Ibrahim', 'Yusuf', 'Ibrahim', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0039', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$zukX8mN5lOubm4IONF5h5Ow7narlhmpNzB9OenotYOIoFd8saAfyO', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 196, NULL, NULL, 'Hussaina Ibrahim', 'Hussaina', 'Ibrahim', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0040', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$GzSpH5VhpqS4HaaWByDcxutIThRzh5dCH8K/cpeqWO6HcYL.NEItu', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 197, NULL, NULL, 'Safiyya Usman', 'Safiyya', 'Usman', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0041', NULL, NULL, 'Returning Student', 'PRIMARY', NULL, NULL, 'CLS0028', 'BASIC 4 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$jaILbClQsU7DN8gqLPAsJuwEgXrr6ubeFEyEb1FD0vCoMnMw3.nEu', '2025-09-02 23:50:53', '2025-09-02 23:50:53'),
(NULL, 198, NULL, NULL, 'Asmau Kakale', 'Asmau', 'Kakale', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0042', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0029', 'SS 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$enRzblirmIg5Nc8YQUDHb.u1t/654xLrFIKi5vL9bf.waEAZv8t5.', '2025-09-03 00:00:48', '2025-09-03 00:00:48'),
(NULL, 199, NULL, NULL, 'Ayda Jamil', 'Ayda', 'Jamil', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0043', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0029', 'SS 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$JFXud/CGbEKLAhRCGCKKbO6frSLcH1Mph0AHBVtL62yvqO6i08q.G', '2025-09-03 00:00:48', '2025-09-03 00:00:48'),
(NULL, 200, NULL, NULL, 'Ni\'ima Habib', 'Ni\'ima', 'Habib', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0044', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0029', 'SS 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$q6NOAJxa6Kuo37XE8qCWqOBsXdY8U3Pu9XZH2RhYxP.yc2nPlJf3C', '2025-09-03 00:00:48', '2025-09-03 00:00:48'),
(NULL, 201, NULL, NULL, 'Ummu Salma Isyaku', 'Ummu', 'Salma', 'Isyaku', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0045', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0029', 'SS 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$nrNwTmV9.NTx6PJOIk02X.37MCGvvUCpOKIXfKv2wR/TAb3LtPdH2', '2025-09-03 00:00:48', '2025-09-03 00:00:48'),
(NULL, 202, NULL, NULL, 'Rabiah Ahmad', 'Rabiah', 'Ahmad', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0046', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0029', 'SS 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$D/Oev3.Dp6HQA.updEGiou9I1LUTh6RUOgW4OHezXZHazg3ND9I/S', '2025-09-03 00:00:48', '2025-09-03 00:00:48'),
(NULL, 203, NULL, NULL, 'Abubakar Yusuf Garba', 'Abubakar', 'Yusuf', 'Garba', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0047', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0029', 'SS 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$I/0ktmSqp30aJp3wqYeltOhAukbwJz7NzovGDnq7.7.J8Af8Vxgee', '2025-09-03 00:00:48', '2025-09-03 00:00:48'),
(NULL, 204, NULL, NULL, 'Amina Almustapha', 'Amina', 'Almustapha', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0048', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0029', 'SS 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$MtUx.oMpUTiq/jcOZxGl1OfaWGjd4J3KZ7FU7Z6DFsnByK7XGQ602', '2025-09-03 00:00:48', '2025-09-03 00:00:48'),
(NULL, 205, NULL, NULL, 'Muhammad Umar', 'Muhammad', 'Umar', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0049', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0029', 'SS 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$HtxWBuV15Zk/0vQ5Fcz0U.h29oioSuZBHTt49sf/ckAk6V8LnjWNC', '2025-09-03 00:00:48', '2025-09-03 00:00:48'),
(NULL, 206, NULL, NULL, 'Muhsin Kakale', 'Muhsin', 'Kakale', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0050', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0029', 'SS 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$9/JYRxEyl6rVA1RMZHRw9u1YoBZl16cdGtTDUjKEpvnWKE/Fc4fM6', '2025-09-03 00:00:48', '2025-09-03 00:00:48'),
(NULL, 207, NULL, NULL, 'Maryam Muhammad Sani', 'Maryam', 'Muhammad', 'Sani', 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0051', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0029', 'SS 1 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$VKJUBqY7g13sjQaI4uNhx.9U0fOYaJe2twkwmnm1Yhm/TjSvZWRDC', '2025-09-03 00:00:48', '2025-09-03 00:00:48'),
(NULL, 208, NULL, NULL, 'MUHAMMAD HUSSAIN KHALID', 'MUHAMMAD', 'HUSSAIN', 'KHALID', 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0052', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0031', 'SS 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$qmt75f1w2h1UiUpeZO30z.AvWi3/pYJEF9hNBsddR5DlxFfvhAQ.6', '2025-09-03 00:01:30', '2025-09-03 00:01:30'),
(NULL, 209, NULL, NULL, 'ABUBAKAR TAHIR', 'ABUBAKAR', 'TAHIR', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0053', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0031', 'SS 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$V2Ir/38kY1.IpUN808I7uu67wS59cemFFtqd3Kpl5WpBx7kIBbfLC', '2025-09-03 00:01:30', '2025-09-03 00:01:30'),
(NULL, 210, NULL, NULL, 'Fatima Abdullahi Hamisu', 'Fatima', 'Abdullahi', 'Hamisu', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0054', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0031', 'SS 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$7URUuZdTx3hNqOY7.M/pWeGYt7HVd2M8lAl8qont9QhsSSaag/Bw.', '2025-09-03 00:01:30', '2025-09-03 00:01:30'),
(NULL, 211, NULL, NULL, 'FATIMA AMINU MAHMUD', 'FATIMA', 'AMINU', 'MAHMUD', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0055', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0031', 'SS 2 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$7YgMjF4qceG.ZFk1NuQILO4COJi4.90hI7M2C1lm6ZUZ/f.jMlNE2', '2025-09-03 00:01:30', '2025-09-03 00:01:30'),
(NULL, 212, NULL, NULL, 'JAFAR KAKALE', 'JAFAR', 'KAKALE', NULL, 'Student', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0056', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0030', 'SS 3 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$TjnUCRvq8XokrUr7E5ZJT.X5UmUlKoN7WV7wSFkGQ7bO2A7gQnoui', '2025-09-03 00:02:08', '2025-09-03 00:02:08'),
(NULL, 213, NULL, NULL, 'KHADIJA ABUBAKAR MAITABA', 'KHADIJA', 'ABUBAKAR', 'MAITABA', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0057', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0030', 'SS 3 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$digypWgMMHjxp.WRBqSi..D5O8zFmT84a7hwjQEMl3eYemk79SlPa', '2025-09-03 00:02:08', '2025-09-03 00:02:08'),
(NULL, 214, NULL, NULL, 'MUHAMMAD ABUBAKAR MAITABA', 'MUHAMMAD', 'ABUBAKAR', 'MAITABA', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0058', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0030', 'SS 3 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$1jCSDMWFaBQa3RkNm4UA5O1Anx1zggmNOxtD9jf8IO4N.2H1GbXva', '2025-09-03 00:02:08', '2025-09-03 00:02:08'),
(NULL, 215, NULL, NULL, 'KHALIPHA UMAR ISYAKU', 'KHALIPHA', 'UMAR', 'ISYAKU', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0059', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0030', 'SS 3 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$0OM8shQG422ni0hZ7gBt4erJsSYIh3681NXEFw8Dk1L0vsKZBUwlu', '2025-09-03 00:02:08', '2025-09-03 00:02:08'),
(NULL, 216, NULL, NULL, 'HAUWA HUSSAIN KHALID', 'HAUWA', 'HUSSAIN', 'KHALID', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0060', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0030', 'SS 3 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$1UKRJ/9sA5MX3t9Tj1L.0uescZJ18..8tomEJ3TJh.8dcueQyp3km', '2025-09-03 00:02:08', '2025-09-03 00:02:08'),
(NULL, 217, NULL, NULL, 'MAIMUNA MUSA', 'MAIMUNA', 'MUSA', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0061', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0030', 'SS 3 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$vSOk1cXiMolSR2ODKRrfPex7WAQqbAnmAHa6aGizj9CAPddpPWE/m', '2025-09-03 00:02:08', '2025-09-03 00:02:08'),
(NULL, 218, NULL, NULL, 'IBRAHIM BASHIR SARKI', 'IBRAHIM', 'BASHIR', 'SARKI', 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0062', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0030', 'SS 3 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$.iXoMHeeWl2awFn/cBWC0u84a8RNJn8zTFu3hMdftDW6j3Ittu25K', '2025-09-03 00:02:08', '2025-09-03 00:02:08'),
(NULL, 219, NULL, NULL, 'AHMAD KABIR', 'AHMAD', 'KABIR', NULL, 'Student', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '980466/2/0063', NULL, NULL, 'Returning Student', 'SENIOR SECONDARY', NULL, NULL, 'CLS0030', 'SS 3 NS', NULL, NULL, NULL, NULL, 'BRCH00012', 'SCH/10', '$2a$10$SxFN4TCnQOV8smCHUUwoleCoGon1MztsDbuzIr2CeRZo61QgH.JCq', '2025-09-03 00:02:08', '2025-09-03 00:02:08');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `subject_code` varchar(50) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `school_id` varchar(11) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `section` varchar(45) NOT NULL,
  `sub_section` varchar(50) DEFAULT NULL,
  `class_code` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`subject_code`, `subject`, `school_id`, `status`, `section`, `sub_section`, `class_code`) VALUES
('SBJ0455', 'AGRIC SCIENCE', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001'),
('SBJ0069', 'ARABIC', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001'),
('SBJ0082', 'BASIC SCIENCE', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001'),
('SBJ0021', 'DRAWING', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001'),
('SBJ0001', 'English Language', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001'),
('SBJ0002', 'English Language', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0002'),
('SBJ0005', 'English Language', 'SCH/1', 'Active', 'PRIMARY', NULL, 'CLS0003'),
('SBJ0007', 'General Mathematics', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001'),
('SBJ0008', 'General Mathematics', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0002'),
('SBJ0006', 'General Mathematics', 'SCH/1', 'Active', 'PRIMARY', NULL, 'CLS0003'),
('SBJ0017', 'HAND WRITING', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001'),
('SBJ0013', 'HEALTH EDUCATION', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001'),
('SBJ0034', 'ISLAMIC STUDIES', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001'),
('SBJ0056', 'RHYMES', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001'),
('SBJ0009', 'SOCIAL STUDIES', 'SCH/1', 'Active', 'NURSERY', NULL, 'CLS0001');

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `passport_url` varchar(200) DEFAULT NULL,
  `user_type` varchar(20) NOT NULL DEFAULT 'Teacher',
  `staff_type` varchar(30) DEFAULT NULL,
  `staff_role` varchar(30) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `sex` varchar(10) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `date_of_birth` varchar(20) DEFAULT NULL,
  `marital_status` varchar(50) DEFAULT NULL,
  `state_of_origin` varchar(100) DEFAULT NULL,
  `mobile_no` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `working_experience` text DEFAULT NULL,
  `religion` varchar(50) DEFAULT NULL,
  `last_place_of_work` varchar(255) DEFAULT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `bank` varchar(100) DEFAULT NULL,
  `branch_id` varchar(20) DEFAULT NULL,
  `school_id` varchar(10) NOT NULL,
  `grade_id` int(11) DEFAULT NULL,
  `step` int(11) DEFAULT 1,
  `payroll_status` enum('Enrolled','Suspended','Pending') DEFAULT 'Pending',
  `date_enrolled` datetime DEFAULT NULL,
  `date_suspended` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `teachers`
--

INSERT INTO `teachers` (`id`, `user_id`, `status`, `passport_url`, `user_type`, `staff_type`, `staff_role`, `name`, `sex`, `age`, `address`, `date_of_birth`, `marital_status`, `state_of_origin`, `mobile_no`, `email`, `qualification`, `working_experience`, `religion`, `last_place_of_work`, `account_name`, `account_number`, `bank`, `branch_id`, `school_id`, `grade_id`, `step`, `payroll_status`, `date_enrolled`, `date_suspended`, `created_at`, `updated_at`) VALUES
(1, 737, 'Active', '', 'Teacher', 'Academic Staff', 'Subject Teacher', 'Ishaq Ibrahim', '', NULL, 'Naibagwa', NULL, '', 'Kano', '07035384180', 'ishaq@gmail.com', 'NCE', '', '', 'ABC Acad', '', '', '', 'BRCH00001', 'SCH/1', 5, 1, 'Pending', NULL, NULL, '2025-08-31 21:45:45', '2025-09-09 14:12:46'),
(2, 738, 'Active', 'https://avatar.iran.liara.run/public/job/teacher/male', 'Teacher', 'Academic Staff', 'Form Master', 'HALIFSA NAGUDU', 'Male', NULL, '', NULL, 'Single', '', '0809874388', 'halifa1@gmail.com', '', '', '', '', '', '', '', 'BRCH00001', 'SCH/1', 5, 1, 'Pending', NULL, NULL, '2025-09-01 12:05:25', '2025-09-09 14:07:53'),
(3, 739, 'Active', 'https://avatar.iran.liara.run/public/job/teacher/male', 'Teacher', 'Academic Staff', 'Form Master', 'nazif abdullahi', 'Male', NULL, 'tudunn murtala kwanar yan gana', '2025-09-16', 'Single', 'kano', '90928', 'boika@gmail.com', 'NCE', '', 'hsh', 'shhs', 'Nazif Abdullahi', '56789', 'shsh', 'BRCH00001', 'SCH/1', NULL, 1, 'Pending', NULL, NULL, '2025-09-16 14:51:59', '2025-09-16 14:51:59');

-- --------------------------------------------------------

--
-- Table structure for table `teacher_classes`
--

CREATE TABLE `teacher_classes` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `class_code` varchar(100) NOT NULL,
  `class_name` varchar(50) NOT NULL,
  `subject_code` varchar(100) NOT NULL,
  `subject` varchar(50) NOT NULL,
  `school_id` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teacher_classes`
--

INSERT INTO `teacher_classes` (`id`, `teacher_id`, `class_code`, `class_name`, `subject_code`, `subject`, `school_id`) VALUES
(1, 13, 'CLS0001', 'Nursery 1', 'SBJ0007', 'General Mathematics', 'SCH/1'),
(2, 16, 'CLS0001', 'Nursery 1', 'SBJ0001', 'English Language', 'SCH/1'),
(3, 17, 'CLS0003', 'Primary 1', 'SBJ0006', 'General Mathematics', 'SCH/1'),
(4, 1, 'CLS0001', 'Nursery 1', 'SBJ0001', 'English Language', 'SCH/1'),
(5, 2, 'CLS0001', 'Nursery 1', 'SBJ0007', 'General Mathematics', 'SCH/1'),
(6, 3, 'CLS0001', 'Nursery 1', 'SBJ0082', 'BASIC SCIENCE', 'SCH/1');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(12) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `user_type` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'Active',
  `branch_id` varchar(20) DEFAULT NULL,
  `school_id` varchar(10) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `username`, `user_type`, `password`, `status`, `branch_id`, `school_id`, `createdAt`, `updatedAt`) VALUES
(1, 'Elite Developer', 'superadmin@gmail.com', NULL, 'Elite Developer', 'superadmin', '$2a$10$ndXl7JXrMHn1J2Pz7RzKN.vkFSKrX6s8CeL3BmVPE9cZxDBt9j10e', 'Active', NULL, 'SCH/1', '2024-09-19 13:41:39', '2025-07-21 11:44:11'),
(584, 'Muhd Aliyu Kurawa', 'Kaliyukurawa@gmail.com', NULL, 'Skcooly', 'superadmin', '$2a$10$ndXl7JXrMHn1J2Pz7RzKN.vkFSKrX6s8CeL3BmVPE9cZxDBt9j10e', 'Active', NULL, 'SCH/1', '2024-09-19 13:41:39', '2025-08-31 21:35:43'),
(712, 'ABC ACADEMY', 'abc@gmail.com', NULL, '213232', 'Admin', '$2a$10$qL7LDw0ALRNBYv/um75BduDGTU2k8eyJe127Q52.9L6d2vi05bCfO', 'Active', NULL, 'SCH/1', '2025-08-27 14:07:04', '2025-08-27 14:07:04'),
(720, 'Ishaq Ibrahim', 'ibagwai9@gmail.com', '07035384189', NULL, 'Teacher', '$2a$10$NFFWEoz6qwO6PsjerPQM6ukOuMO3UU4/We6aV4aAHqE4hdByfqDEi', 'Active', NULL, 'SCH/1', '2025-08-28 01:23:04', '2025-08-28 01:23:04'),
(724, 'HALIFA NAGUDU', 'nagudu@gmail.com', '07842788932', NULL, 'Teacher', '$2a$10$tl3zRNtvY9CsXbpZqwKKzOdXnaQwfZKx8w7W/2HtYdwtIemELcce2', 'Active', NULL, 'SCH/1', '2025-08-28 10:41:37', '2025-08-28 10:41:37'),
(727, 'MUHAMMAD KURAWA', '', '', NULL, 'Teacher', '$2a$10$M8EFtUFLDxWGnt6g8dbxUO0FxLbGfLscQ/n/phFBlvoWKt1bZ2aZG', 'Active', NULL, 'SCH/1', '2025-08-28 11:02:20', '2025-08-28 11:02:20'),
(731, 'MUHAMMAD HAMZA', 'hhfh@hhf.com', '9786767', '9786767', 'parent', '$2a$10$6AYlh1gL8z8U1xIKWIHb7OoGlOM3HvHVly31E17wnYdO2TTdsZuE.', 'Active', NULL, 'SCH/1', '2025-08-28 17:06:32', '2025-08-28 17:06:32'),
(735, 'Admin', 'admin@sss.com', NULL, '980466', 'Admin', '$2a$10$iTyXq..U5/CrF0hyTdabg.c0Sp3jQh3mDlJp4BenGMKA.kdYN8ZOC', 'Active', NULL, 'SCH/10', '2025-08-28 18:05:58', '2025-08-28 18:05:58'),
(737, 'Ishaq Ibrahim', 'ishaq@gmail.com', NULL, '07035384180', 'Teacher', '$2a$10$sI0SXV/0gXU7PQg5mmr0GuBrfXecCJ.fCASC8/XfSE/iMsM/Xgd0S', 'Active', NULL, 'SCH/1', '2025-08-31 21:45:45', '2025-08-31 21:45:45'),
(738, 'HALIFSA NAGUDU', 'halifa1@gmail.com', NULL, '0809874388', 'Teacher', '$2a$10$N.9oeO/9YMNpYgIFO7nzTuPOF3PocC0yt1xJ8FnmuYonV8Qd0mjVG', 'Active', NULL, 'SCH/1', '2025-09-01 12:05:25', '2025-09-01 12:05:25'),
(739, 'nazif abdullahi', 'boika@gmail.com', NULL, '90928', 'Admin', '$2a$10$3BtmYjguqVHLHuswjCgwrurIwZue.Y5NULDOHnf8TgHJ2ggUZLs5m', 'Active', NULL, 'SCH/1', '2025-09-16 14:51:59', '2025-09-16 14:51:59');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `teacher_id` (`teacher_id`),
  ADD KEY `school_id` (`school_id`,`branch_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `assignments_teacher_id` (`teacher_id`),
  ADD KEY `assignments_class_code` (`class_code`),
  ADD KEY `assignments_subject_code` (`subject_code`),
  ADD KEY `assignments_school_id` (`school_id`),
  ADD KEY `assignments_branch_id` (`branch_id`),
  ADD KEY `assignments_status` (`status`),
  ADD KEY `assignments_academic_year_term` (`academic_year`,`term`),
  ADD KEY `assignments_assignment_date` (`assignment_date`),
  ADD KEY `assignments_submission_date` (`submission_date`);

--
-- Indexes for table `assignment_questions`
--
ALTER TABLE `assignment_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assignment_id` (`assignment_id`),
  ADD KEY `assignment_questions_assignment_id` (`assignment_id`);

--
-- Indexes for table `assignment_responses`
--
ALTER TABLE `assignment_responses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `assignment_id` (`assignment_id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`class_name`,`section`,`school_id`,`branch_id`),
  ADD UNIQUE KEY `class_code` (`class_code`),
  ADD KEY `school_id` (`school_id`),
  ADD KEY `section` (`section`),
  ADD KEY `class_name` (`class_name`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `class_role`
--
ALTER TABLE `class_role`
  ADD PRIMARY KEY (`teacher_id`,`role`) USING BTREE;

--
-- Indexes for table `lessons`
--
ALTER TABLE `lessons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`,`created_at`),
  ADD KEY `school_id` (`school_id`);

--
-- Indexes for table `lesson_comments`
--
ALTER TABLE `lesson_comments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `lesson_time_table`
--
ALTER TABLE `lesson_time_table`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`admission_no`),
  ADD UNIQUE KEY `id` (`id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`subject`,`school_id`,`section`,`class_code`),
  ADD UNIQUE KEY `id` (`subject_code`),
  ADD KEY `id_2` (`subject_code`),
  ADD KEY `school_id` (`school_id`),
  ADD KEY `subject` (`subject`,`section`),
  ADD KEY `class_code` (`class_code`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `teachers_school_id_email` (`school_id`,`email`),
  ADD UNIQUE KEY `teachers_school_id_mobile_no` (`school_id`,`mobile_no`),
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `email` (`email`,`school_id`),
  ADD KEY `grade_id` (`grade_id`),
  ADD KEY `idx_teachers_step` (`step`);

--
-- Indexes for table `teacher_classes`
--
ALTER TABLE `teacher_classes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `email_2` (`email`),
  ADD UNIQUE KEY `email_3` (`email`),
  ADD UNIQUE KEY `email_4` (`email`),
  ADD UNIQUE KEY `email_5` (`email`),
  ADD UNIQUE KEY `email_6` (`email`),
  ADD UNIQUE KEY `email_7` (`email`),
  ADD UNIQUE KEY `email_8` (`email`),
  ADD UNIQUE KEY `email_9` (`email`),
  ADD UNIQUE KEY `email_10` (`email`),
  ADD UNIQUE KEY `email_11` (`email`),
  ADD UNIQUE KEY `email_12` (`email`),
  ADD UNIQUE KEY `email_13` (`email`),
  ADD UNIQUE KEY `email_14` (`email`),
  ADD UNIQUE KEY `email_15` (`email`),
  ADD UNIQUE KEY `email_16` (`email`),
  ADD UNIQUE KEY `email_17` (`email`),
  ADD UNIQUE KEY `email_18` (`email`),
  ADD UNIQUE KEY `email_19` (`email`),
  ADD UNIQUE KEY `email_20` (`email`),
  ADD UNIQUE KEY `email_21` (`email`),
  ADD UNIQUE KEY `email_22` (`email`),
  ADD UNIQUE KEY `email_23` (`email`),
  ADD UNIQUE KEY `email_24` (`email`),
  ADD UNIQUE KEY `email_25` (`email`),
  ADD UNIQUE KEY `email_26` (`email`),
  ADD UNIQUE KEY `email_27` (`email`),
  ADD UNIQUE KEY `email_28` (`email`),
  ADD UNIQUE KEY `email_29` (`email`),
  ADD UNIQUE KEY `email_30` (`email`),
  ADD UNIQUE KEY `email_31` (`email`),
  ADD UNIQUE KEY `email_32` (`email`),
  ADD UNIQUE KEY `email_33` (`email`),
  ADD UNIQUE KEY `email_34` (`email`),
  ADD UNIQUE KEY `email_35` (`email`),
  ADD UNIQUE KEY `email_36` (`email`),
  ADD UNIQUE KEY `email_37` (`email`),
  ADD UNIQUE KEY `email_38` (`email`),
  ADD UNIQUE KEY `email_39` (`email`),
  ADD KEY `school_id` (`school_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `assignments`
--
ALTER TABLE `assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `assignment_questions`
--
ALTER TABLE `assignment_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `assignment_responses`
--
ALTER TABLE `assignment_responses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `lessons`
--
ALTER TABLE `lessons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `lesson_comments`
--
ALTER TABLE `lesson_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `lesson_time_table`
--
ALTER TABLE `lesson_time_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=220;

--
-- AUTO_INCREMENT for table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `teacher_classes`
--
ALTER TABLE `teacher_classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=740;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assignment_responses`
--
ALTER TABLE `assignment_responses`
  ADD CONSTRAINT `assignment_responses_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignment_responses_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `assignment_questions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teachers`
--
ALTER TABLE `teachers`
  ADD CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`grade_id`) REFERENCES `grade_levels` (`grade_id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
