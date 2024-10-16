<?php
session_start(); // Start the session

// Fetch invoices from query parameters
$invoices = [];
if (isset($_GET['invoices'])) {
    $invoices = json_decode($_GET['invoices'], true); // Decode the JSON string
}

// Check if invoices exist
if (empty($invoices)) {
    echo '<p>No invoices found.</p>';
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoices</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
</head>
<body>
<div class="container mt-5">
    <h1>Invoices</h1>
    <table class="table table-striped">
        <thead>
            <tr>
                <th>Doc Number</th>
                <th>Transaction Date</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($invoices as $invoice): ?>
                <tr>
                    <td><?php echo htmlspecialchars($invoice['DocNumber']); ?></td>
                    <td><?php echo htmlspecialchars($invoice['TxnDate']); ?></td>
                    <td><?php echo htmlspecialchars($invoice['CustomerRef']['name']); ?></td>
                    <td><?php echo htmlspecialchars($invoice['TotalAmt']); ?></td>
                    <td><?php echo htmlspecialchars($invoice['PrintStatus']); ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>
</body>
</html>
