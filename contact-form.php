<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

/* =========================================================
   EMAIL CONFIGURATION
   ========================================================= */

$recipient = 'jayantochoudhury07@gmail.com';

/* =========================================================
   RESPONSE HELPER
   ========================================================= */

function respond(bool $success, string $message, int $status = 200): void
{
    http_response_code($status);

    echo json_encode(
        [
            'success' => $success,
            'message' => $message
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

/* =========================================================
   REQUEST METHOD
   ========================================================= */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Invalid request method.', 405);
}

/* =========================================================
   HONEYPOT
   ========================================================= */

if (!empty($_POST['botcheck'])) {
    respond(true, 'Submission received.');
}

/* =========================================================
   GET FORM DATA
   ========================================================= */

function post_string(string $key): string
{
    $value = $_POST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

$name        = post_string('name');
$email       = post_string('email');
$phone       = post_string('phone');
$projectType = post_string('project_type');
$budget      = post_string('budget');
$timeline    = post_string('timeline');
$project     = post_string('project');

/* =========================================================
   VALIDATION
   ========================================================= */

if ($name === '' || mb_strlen($name) < 2) {
    respond(false, 'Please enter your name.', 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Please enter a valid email address.', 422);
}

if (preg_match_all('/\d/', $phone) < 8) {
    respond(false, 'Please enter a valid phone number.', 422);
}

$allowedProjectTypes = [
    'pre-production',
    'production',
    'post-production',
    'commercial',
    'corporate',
    'resort',
    'documentary',
    'other',
];

if ($projectType === '' || !in_array($projectType, $allowedProjectTypes, true)) {
    respond(false, 'Please select a valid project type.', 422);
}

if ($project === '' || mb_strlen($project) < 10) {
    respond(false, 'Please provide more details about your project.', 422);
}

/* =========================================================
   CLEAN USER INPUT
   ========================================================= */

$name        = preg_replace('/[\r\n]+/', ' ', $name);
$email       = preg_replace('/[\r\n]+/', '', $email);
$phone       = preg_replace('/[\r\n]+/', ' ', $phone);
$projectType = preg_replace('/[\r\n]+/', ' ', $projectType);
$budget      = preg_replace('/[\r\n]+/', ' ', $budget);
$timeline    = preg_replace('/[\r\n]+/', ' ', $timeline);
$project     = str_replace(["\r\n", "\r"], "\n", $project);

/* =========================================================
   EMAIL SUBJECT
   ========================================================= */

$subject = 'New Project Brief — ' . $name;

/* =========================================================
   EMAIL BODY
   ========================================================= */

$body  = "NEW PROJECT BRIEF\n";
$body .= "=================\n\n";

$body .= "Name: " . $name . "\n";
$body .= "Email: " . $email . "\n";
$body .= "Phone: " . $phone . "\n";
$body .= "Project Type: " . $projectType . "\n";
$body .= "Budget Range: " . ($budget !== '' ? $budget : 'Not specified') . "\n";
$body .= "Timeline: " . ($timeline !== '' ? $timeline : 'Not specified') . "\n\n";

$body .= "PROJECT DETAILS\n";
$body .= "---------------\n";
$body .= $project . "\n\n";

$body .= "Submitted from: Cloudsartist21 Contact Website\n";
$body .= "IP Address: " . ($_SERVER['REMOTE_ADDR'] ?? 'Unknown') . "\n";

/* =========================================================
   EMAIL HEADERS
   ========================================================= */

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    'From: Cloudsartist21 Website <noreply@cloudsartist21.com>',
    'Reply-To: ' . $email,
    'Date: ' . date('r'),
    'X-Mailer: PHP/' . PHP_VERSION,
];

/* =========================================================
   SEND EMAIL
   ========================================================= */

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$encodedBody    = chunk_split(base64_encode($body));

$sent = @mail(
    $recipient,
    $encodedSubject,
    $encodedBody,
    implode("\r\n", $headers)
);

/* =========================================================
   RESULT
   ========================================================= */

if (!$sent) {
    respond(
        false,
        'The server could not send the email right now. Please email us directly at ' . $recipient . '.',
        500
    );
}

respond(true, 'Your message has been sent successfully.');