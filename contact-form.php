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

function respond(
    bool $success,
    string $message,
    int $status = 200
): never {

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

    respond(
        false,
        'Invalid request method.',
        405
    );
}


/* =========================================================
   HONEYPOT
   ========================================================= */

if (!empty($_POST['botcheck'])) {

    respond(
        true,
        'Submission received.'
    );
}


/* =========================================================
   GET FORM DATA
   ========================================================= */

$name = trim(
    (string)($_POST['name'] ?? '')
);

$email = trim(
    (string)($_POST['email'] ?? '')
);

$phone = trim(
    (string)($_POST['phone'] ?? '')
);

$projectType = trim(
    (string)($_POST['project_type'] ?? '')
);

$budget = trim(
    (string)($_POST['budget'] ?? '')
);

$timeline = trim(
    (string)($_POST['timeline'] ?? '')
);

$project = trim(
    (string)($_POST['project'] ?? '')
);


/* =========================================================
   VALIDATION
   ========================================================= */

if (
    $name === '' ||
    mb_strlen($name) < 2
) {

    respond(
        false,
        'Please enter your name.',
        422
    );
}


if (
    !filter_var(
        $email,
        FILTER_VALIDATE_EMAIL
    )
) {

    respond(
        false,
        'Please enter a valid email address.',
        422
    );
}


if (
    preg_match_all(
        '/\d/',
        $phone
    ) < 8
) {

    respond(
        false,
        'Please enter a valid phone number.',
        422
    );
}


if ($projectType === '') {

    respond(
        false,
        'Please select a project type.',
        422
    );
}


if (
    $project === '' ||
    mb_strlen($project) < 10
) {

    respond(
        false,
        'Please provide more details about your project.',
        422
    );
}


/* =========================================================
   CLEAN USER INPUT
   ========================================================= */

$name = preg_replace(
    '/[\r\n]+/',
    ' ',
    $name
);

$email = preg_replace(
    '/[\r\n]+/',
    '',
    $email
);

$phone = preg_replace(
    '/[\r\n]+/',
    ' ',
    $phone
);

$projectType = preg_replace(
    '/[\r\n]+/',
    ' ',
    $projectType
);

$budget = preg_replace(
    '/[\r\n]+/',
    ' ',
    $budget
);

$timeline = preg_replace(
    '/[\r\n]+/',
    ' ',
    $timeline
);

$project = str_replace(
    ["\r\n", "\r"],
    "\n",
    $project
);


/* =========================================================
   EMAIL SUBJECT
   ========================================================= */

$subject =
    'New Project Brief — ' .
    $name;


/* =========================================================
   EMAIL BODY
   ========================================================= */

$body = '';

$body .= "NEW PROJECT BRIEF\n";
$body .= "=================\n\n";

$body .= "Name: ";
$body .= $name;
$body .= "\n";

$body .= "Email: ";
$body .= $email;
$body .= "\n";

$body .= "Phone: ";
$body .= $phone;
$body .= "\n";

$body .= "Project Type: ";
$body .= $projectType;
$body .= "\n";

$body .= "Budget Range: ";
$body .= (
    $budget !== ''
        ? $budget
        : 'Not specified'
);
$body .= "\n";

$body .= "Timeline: ";
$body .= (
    $timeline !== ''
        ? $timeline
        : 'Not specified'
);
$body .= "\n\n";


$body .= "PROJECT DETAILS\n";
$body .= "---------------\n";

$body .= $project;
$body .= "\n\n";


$body .= "Submitted from: ";
$body .= "Cloudsartist21 Contact Website\n";

$body .= "IP Address: ";
$body .= (
    $_SERVER['REMOTE_ADDR']
    ?? 'Unknown'
);

$body .= "\n";


/* =========================================================
   EMAIL HEADERS
   ========================================================= */

$headers = [

    'MIME-Version: 1.0',

    'Content-Type: text/plain; charset=UTF-8',

    'From: Cloudsartist21 Website <noreply@cloudsartist21.com>',

    'Reply-To: ' . $email,

    'X-Mailer: PHP/' . PHP_VERSION

];


/* =========================================================
   SEND EMAIL
   ========================================================= */

$sent = mail(

    $recipient,

    '=?UTF-8?B?' .
    base64_encode($subject) .
    '?=',

    $body,

    implode(
        "\r\n",
        $headers
    )

);


/* =========================================================
   RESULT
   ========================================================= */

if (!$sent) {

    respond(

        false,

        'The server could not send the email right now. Please email us directly at ' .
        $recipient .
        '.',

        500

    );
}


respond(

    true,

    'Your message has been sent successfully.'

);

?>