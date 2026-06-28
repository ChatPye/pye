'use client';

import { useState } from 'react';
import { ArrowRight, Check, Shield, Users, BarChart3, Zap, Globe, Headphones } from 'lucide-react';

export default function EnterprisePage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    teamSize: '',
    useCase: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Enterprise form submitted:', formData);
  };

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Unlimited Scale",
      description: "Support for thousands of learners across your organization"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Enterprise Security",
      description: "SOC2 compliance, SSO, private cloud deployment"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Advanced Analytics",
      description: "Deep insights into learning patterns and ROI"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Custom AI Models",
      description: "Tailored AI tutors trained on your specific content"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Global Deployment",
      description: "Multi-region support with local data residency"
    },
    {
      icon: <Headphones className="w-8 h-8" />,
      title: "Dedicated Support",
      description: "24/7 enterprise support with dedicated success manager"
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-white">
              Enterprise Learning Platform
            </h1>
            <p className="mt-6 text-xl text-zinc-400 max-w-3xl mx-auto">
              Transform your organization's learning with AI-powered training that scales to thousands of learners, 
              integrates with your existing systems, and delivers measurable results.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#contact-form" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Get Enterprise Demo
                <ArrowRight className="w-5 h-5" />
              </a>
              <a href="#features" className="inline-flex items-center gap-2 border border-zinc-600 text-zinc-300 px-8 py-4 rounded-lg font-medium hover:bg-zinc-800 transition-colors">
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold tracking-tight text-white">
              Built for Enterprise Scale
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Everything you need to deliver world-class learning experiences at scale
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-zinc-900 rounded-lg p-8">
                <div className="text-blue-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features Detail */}
      <section className="py-24 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-semibold tracking-tight text-white mb-6">
                Everything in Teams + More
              </h2>
              <p className="text-lg text-zinc-400 mb-8">
                Our Enterprise plan includes all Team features plus advanced capabilities 
                designed for large organizations.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Check className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Unlimited AI Tutor + Unlimited Storage + Agents</h3>
                    <p className="text-zinc-400">No limits on AI interactions, content storage, and access to productivity agents</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Check className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Private Communities</h3>
                    <p className="text-zinc-400">Secure, isolated learning environments for your organization</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Check className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">XR/VR Simulations</h3>
                    <p className="text-zinc-400">Immersive learning experiences with virtual reality</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Check className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">ScoutHR Talent Pipelines</h3>
                    <p className="text-zinc-400">Connect learning outcomes to talent acquisition</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Check className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">Advanced Analytics</h3>
                    <p className="text-zinc-400">Engagement heatmaps and detailed learning insights</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Check className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">SOC2 Compliance</h3>
                    <p className="text-zinc-400">Enterprise-grade security and compliance standards</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-zinc-900 rounded-lg p-8">
              <h3 className="text-2xl font-semibold text-white mb-6">Ready to Get Started?</h3>
              <p className="text-zinc-400 mb-6">
                Contact our enterprise team to discuss your organization's learning needs 
                and get a customized solution.
              </p>
              <a href="#contact-form" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Contact Sales Team
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact-form" className="py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-semibold tracking-tight text-white">
              Get Your Enterprise Demo
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Tell us about your organization and we'll set up a personalized demo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-lg p-8">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Work Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Company *</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Job Title</label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Learning & Development Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Team Size</label>
                <select
                  name="teamSize"
                  value={formData.teamSize}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select team size</option>
                  <option value="10-50">10-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-1000">201-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Primary Use Case</label>
              <select
                name="useCase"
                value={formData.useCase}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select primary use case</option>
                <option value="employee-training">Employee Training & Development</option>
                <option value="customer-education">Customer Education</option>
                <option value="partner-training">Partner/Channel Training</option>
                <option value="compliance">Compliance Training</option>
                <option value="onboarding">New Employee Onboarding</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Additional Information</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Tell us about your learning goals, current challenges, or specific requirements..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Request Enterprise Demo
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
