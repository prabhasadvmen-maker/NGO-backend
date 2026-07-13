import fs from 'fs';
import path from 'path';

const MOCK_INBOX_DIR = path.resolve('scratch');
const MOCK_INBOX_PATH = path.join(MOCK_INBOX_DIR, 'communication_inbox.json');

// Ensure mock folder exists
if (!fs.existsSync(MOCK_INBOX_DIR)) {
  fs.mkdirSync(MOCK_INBOX_DIR, { recursive: true });
}

/**
 * Dispatch message in bulk
 * @param {object} log - The CommunicationLog details
 * @param {Array} recipients - List of recipient objects { email, mobile, name }
 */
export async function dispatchBulkCommunication(log, recipients) {
  try {
    console.log(`📡 Dispatching ${log.type} to ${recipients.length} recipients...`);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Save to local mock mailbox for validation/client inspection
    let mockInbox = [];
    if (fs.existsSync(MOCK_INBOX_PATH)) {
      try {
        mockInbox = JSON.parse(fs.readFileSync(MOCK_INBOX_PATH, 'utf8'));
      } catch (e) {
        mockInbox = [];
      }
    }

    const newDispatchEntry = {
      id: Date.now().toString(),
      type: log.type,
      subject: log.subject || 'No Subject',
      message: log.message,
      recipientType: log.recipientType,
      recipients: recipients.map(r => ({ name: r.name, email: r.email, mobile: r.mobile })),
      sentAt: new Date().toISOString(),
      status: 'Sent'
    };

    mockInbox.unshift(newDispatchEntry);
    
    // Keep inbox to last 100 entries
    if (mockInbox.length > 100) {
      mockInbox = mockInbox.slice(0, 100);
    }

    fs.writeFileSync(MOCK_INBOX_PATH, JSON.stringify(mockInbox, null, 2), 'utf8');
    console.log(`✅ Saved ${log.type} dispatch entry in communication_inbox.json`);
    
    return true;
  } catch (error) {
    console.error('Error dispatching communication:', error);
    return false;
  }
}
