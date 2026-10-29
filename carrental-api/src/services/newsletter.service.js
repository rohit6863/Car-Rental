'use strict';
const { query } = require('../db/pool');

class NewsletterService {
  async subscribe(email) {
    const [existing] = await query('SELECT id FROM tblsubscribers WHERE SubscriberEmail = ?', [email]);
    if (existing.length > 0) {
      return { success: false, alreadySubscribed: true, message: 'Already Subscribed.' };
    }

    await query('INSERT INTO tblsubscribers (SubscriberEmail) VALUES (?)', [email]);
    return { success: true, message: 'Subscribed successfully.' };
  }

  async adminGetSubscribers() {
    const [rows] = await query('SELECT * FROM tblsubscribers ORDER BY id DESC');
    return rows;
  }
}

module.exports = new NewsletterService();
