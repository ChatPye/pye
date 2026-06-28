/**
 * MailerLite Integration Helper
 * 
 * This module handles integration with MailerLite for email sequences
 * and user class detection
 */

const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
const MAILERLITE_GROUP_ID = process.env.MAILERLITE_GROUP_ID;
const BASE_URL = 'https://connect.mailerlite.com/api';

interface MailerLiteUser {
  email: string;
  name?: string;
  fields?: {
    first_name?: string;
    last_name?: string;
    user_class?: 'freemium' | 'pro' | 'inactive';
    video_count?: number;
    question_count?: number;
    notes_count?: number;
    last_video_name?: string;
    last_video_stats?: string;
    learning_hours?: number;
    top_video?: string;
    top_day?: string;
    improvement_metric?: string;
  };
}

interface MailerLiteSequence {
  id: string;
  name: string;
  description: string;
  group_id: number;
}

export class MailerLiteService {
  private headers = {
    'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  /**
   * Add or update a user in MailerLite
   */
  async addOrUpdateUser(user: MailerLiteUser): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/subscribers`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          fields: user.fields,
          groups: [parseInt(MAILERLITE_GROUP_ID || '0')]
        })
      });

      if (response.ok) {
        return true;
      }

      const errorText = await response.text();

      // Treat "already subscribed" style errors as success so users can resubmit safely
      if (response.status === 409 || /already/i.test(errorText)) {
        console.warn('MailerLite indicates subscriber already exists, treating as success');
        return true;
      }

      console.error('MailerLite API error:', errorText);
      return false;
    } catch (error) {
      console.error('Error adding user to MailerLite:', error);
      return false;
    }
  }

  /**
   * Update user class and trigger appropriate email sequence
   */
  async updateUserClass(
    email: string, 
    userClass: 'freemium' | 'pro' | 'inactive',
    additionalFields?: Partial<MailerLiteUser['fields']>
  ): Promise<boolean> {
    try {
      // Update user fields
      const response = await fetch(`${BASE_URL}/subscribers`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({
          email,
          fields: {
            user_class: userClass,
            ...additionalFields
          }
        })
      });

      if (!response.ok) {
        console.error('MailerLite API error:', await response.text());
        return false;
      }

      // Trigger appropriate email sequence based on user class
      await this.triggerEmailSequence(email, userClass);

      return true;
    } catch (error) {
      console.error('Error updating user class:', error);
      return false;
    }
  }

  /**
   * Trigger email sequence based on user class
   */
  private async triggerEmailSequence(
    email: string, 
    userClass: 'freemium' | 'pro' | 'inactive'
  ): Promise<boolean> {
    try {
      // Get available sequences
      const sequencesResponse = await fetch(`${BASE_URL}/sequences`, {
        method: 'GET',
        headers: this.headers
      });

      if (!sequencesResponse.ok) {
        console.error('Error fetching sequences:', await sequencesResponse.text());
        return false;
      }

      const sequences = await sequencesResponse.json();
      
      // Find the appropriate sequence based on user class
      let targetSequence: MailerLiteSequence | null = null;
      
      switch (userClass) {
        case 'freemium':
          targetSequence = sequences.data.find((seq: MailerLiteSequence) => 
            seq.name.includes('Freemium Welcome')
          );
          break;
        case 'pro':
          targetSequence = sequences.data.find((seq: MailerLiteSequence) => 
            seq.name.includes('Pro Welcome')
          );
          break;
        case 'inactive':
          targetSequence = sequences.data.find((seq: MailerLiteSequence) => 
            seq.name.includes('Re-engagement')
          );
          break;
      }

      if (!targetSequence) {
        console.error(`No sequence found for user class: ${userClass}`);
        return false;
      }

      // Add user to sequence
      const addToSequenceResponse = await fetch(`${BASE_URL}/sequences/${targetSequence.id}/subscribers`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          email
        })
      });

      if (!addToSequenceResponse.ok) {
        console.error('Error adding user to sequence:', await addToSequenceResponse.text());
        return false;
      }

      console.log(`User ${email} added to sequence: ${targetSequence.name}`);
      return true;

    } catch (error) {
      console.error('Error triggering email sequence:', error);
      return false;
    }
  }

  /**
   * Get user statistics for email personalization
   */
  async getUserStats(email: string): Promise<Partial<MailerLiteUser['fields']> | null> {
    try {
      const response = await fetch(`${BASE_URL}/subscribers?filter[email]=${email}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        console.error('Error fetching user stats:', await response.text());
        return null;
      }

      const data = await response.json();
      const user = data.data[0];

      if (!user) {
        return null;
      }

      return {
        video_count: user.fields?.video_count || 0,
        question_count: user.fields?.question_count || 0,
        notes_count: user.fields?.notes_count || 0,
        last_video_name: user.fields?.last_video_name || '',
        last_video_stats: user.fields?.last_video_stats || '',
        learning_hours: user.fields?.learning_hours || 0,
        top_video: user.fields?.top_video || '',
        top_day: user.fields?.top_day || '',
        improvement_metric: user.fields?.improvement_metric || ''
      };

    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStats(
    email: string, 
    stats: Partial<MailerLiteUser['fields']>
  ): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/subscribers`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({
          email,
          fields: stats
        })
      });

      if (!response.ok) {
        console.error('Error updating user stats:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user stats:', error);
      return false;
    }
  }
}

// Export singleton instance
export const mailerLiteService = new MailerLiteService();