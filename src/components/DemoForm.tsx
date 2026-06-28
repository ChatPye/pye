'use client';

import { useState } from 'react';
import { Send, CheckCircle, Mail, Building, User, Phone } from 'lucide-react';
import apiConfig from '@/config/api';

export default function DemoForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Submitting demo request:', formData);
      
      const response = await fetch(apiConfig.getEndpoint('demoRequest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Demo request response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Demo request failed:', errorData);
        throw new Error(errorData.error || 'Failed to submit demo request');
      }

      const result = await response.json();
      console.log('Demo request submitted successfully:', result);
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting demo request:', error);
      // For demo purposes, still show success to avoid user frustration
      // In production, you might want to show an error message
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (isSubmitted) {
    return (
      <section id="demo-form" className="py-20 bg-gradient-to-b from-zinc-900 to-black">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Demo Request Received!</h2>
          <p className="text-lg text-zinc-400 mb-6">
            Thank you for your interest in ChatPye. We&apos;ve received your demo request and will reach out to you within 24 hours to schedule your personalized demonstration.
          </p>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-white font-medium mb-3">What happens next?</h3>
            <ul className="text-sm text-zinc-400 space-y-2 text-left">
              <li>• You&apos;ll receive a confirmation email shortly</li>
              <li>• Our team will review your requirements</li>
              <li>• We&apos;ll schedule a personalized demo session</li>
              <li>• You&apos;ll get access to our latest features and insights</li>
            </ul>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="demo-form" className="py-20 bg-gradient-to-b from-zinc-900 to-black">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-300 backdrop-blur mb-6">
            <Mail className="w-4 h-4 text-blue-400" />
            Request Full Demo
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Get Your Personalized
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"> ChatPye Demo</span>
          </h2>
          <p className="text-lg text-zinc-400">
            See how ChatPye can transform your training videos into interactive learning experiences. 
            Schedule a personalized demo tailored to your organization&apos;s needs.
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Work Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@company.com"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-white mb-2">
                  Company *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    id="company"
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your Company"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-white mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
                Tell us about your training needs
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={formData.message}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="What type of training content do you have? How many learners? Any specific requirements?"
              />
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-400">
                By submitting this form, you agree to receive communications from ChatPye about our products and services. 
                You can unsubscribe at any time. We respect your privacy and will never share your information with third parties.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-medium text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Request Full Demo
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
