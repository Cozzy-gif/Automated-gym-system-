const db = require('../db/database');

const processPayment = (member_id, plan_type, amount, callback) => {
    if (!member_id || !plan_type || !amount) {
        return callback({ success: false, message: 'Missing payment details' });
    }

    // Calculate new expiry date
    const currentDate = new Date();
    let durationMonths = 0;

    switch (plan_type) {
        case 'Monthly': durationMonths = 1; break;
        case 'Quarterly': durationMonths = 3; break;
        case 'Annual': durationMonths = 12; break;
        default: return callback({ success: false, message: 'Invalid plan type' });
    }

    currentDate.setMonth(currentDate.getMonth() + durationMonths);
    const newExpiryDateStr = currentDate.toISOString().split('T')[0];
    const startDateStr = new Date().toISOString().split('T')[0];

    // Check if membership exists
    db.get('SELECT id FROM Memberships WHERE member_id = ?', [member_id], (err, row) => {
        if (err) return callback({ success: false, message: 'Database error' });

        if (row) {
            // Update existing membership
            db.run(`UPDATE Memberships SET plan_type = ?, expiry_date = ?, status = 'Active' WHERE member_id = ?`,
                [plan_type, newExpiryDateStr, member_id],
                function (updateErr) {
                    if (updateErr) return callback({ success: false, message: 'Failed to update membership' });

                    const receiptId = 'REC' + Date.now();
                    const paymentDate = new Date().toISOString().split('T')[0];

                    db.run(`INSERT INTO Payments (member_id, amount, plan_type, payment_date, receipt_id) VALUES (?, ?, ?, ?, ?)`,
                        [member_id, amount, plan_type, paymentDate, receiptId],
                        function (paymentErr) {
                            if (paymentErr) return callback({ success: false, message: 'Failed to log payment transaction' });

                            const receipt = {
                                receipt_id: receiptId,
                                member_id: member_id,
                                plan: plan_type,
                                amount_paid: amount,
                                new_expiry: newExpiryDateStr
                            };
                            db.run("INSERT INTO ActivityLogs (activity_type, description, timestamp) VALUES (?, ?, ?)",
                                ['FINANCE', `Payment received: Ksh ${amount} for Plan ${plan_type} (Member ID ${member_id})`, new Date().toISOString()]);
                            return callback(null, { success: true, message: 'Payment processed and membership renewed', receipt });
                        }
                    );
                }
            );
        } else {
            // Create new membership record
            db.run(`INSERT INTO Memberships (member_id, plan_type, start_date, expiry_date, status) VALUES (?, ?, ?, ?, ?)`,
                [member_id, plan_type, startDateStr, newExpiryDateStr, 'Active'],
                function (insertErr) {
                    if (insertErr) return callback({ success: false, message: 'Failed to create membership' });

                    const receiptId = 'REC' + Date.now();
                    const paymentDate = new Date().toISOString().split('T')[0];

                    db.run(`INSERT INTO Payments (member_id, amount, plan_type, payment_date, receipt_id) VALUES (?, ?, ?, ?, ?)`,
                        [member_id, amount, plan_type, paymentDate, receiptId],
                        function (paymentErr) {
                            if (paymentErr) return callback({ success: false, message: 'Failed to log payment transaction' });

                            const receipt = {
                                receipt_id: receiptId,
                                member_id: member_id,
                                plan: plan_type,
                                amount_paid: amount,
                                new_expiry: newExpiryDateStr
                            };
                            return callback(null, { success: true, message: 'Payment processed and new membership created', receipt });
                        }
                    );
                }
            );
        }
    });

};

module.exports = {
    processPayment
};
