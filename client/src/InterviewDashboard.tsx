import { useEffect, useState } from 'react';
import { Calendar, Clock, User, Code, Award, ChevronRight, Briefcase } from 'lucide-react';
import { readJsonResponse } from './utils/apiResponse';
import { getApiBaseUrl } from './utils/apiBaseUrl';

interface FormData {
  candidateName: string;
  technology: string;
  role: string;
  domain?: string;
  interviewDate: string;
  interviewTime: string;
  customerProjectProfile?: any;
}

interface FormErrors {
  candidateName?: string;
  technology?: string;
  role?: string;
  interviewDate?: string;
  interviewTime?: string;
  domain?: string;
}

interface Props {
  onStart: (data: FormData) => void;
  initialData?: Partial<FormData> | null;
}

const apiBaseUrl = getApiBaseUrl();

export default function InterviewDashboard({ onStart, initialData = null }: Props) {
  const isPrefilled = Boolean(initialData);

  const [formData, setFormData] = useState<FormData>(() => ({
    candidateName: initialData?.candidateName || '',
    technology: initialData?.technology || '',
    role: initialData?.role || '',
    domain: initialData?.domain || '',
    interviewDate: initialData?.interviewDate || new Date().toISOString().split('T')[0],
    interviewTime: initialData?.interviewTime || '',
    customerProjectProfile: initialData?.customerProjectProfile
  }));

  const [errors, setErrors] = useState<FormErrors>({});
  const [showInterview, setShowInterview] = useState(false);
  const [activeProfiles, setActiveProfiles] = useState<any[]>([]);

  const technologies = [
    { value: 'swift', label: 'iOS - Swift / SwiftUI' },
    { value: 'kotlin', label: 'Android - Kotlin' },
    { value: 'react-native', label: 'React Native' },
    { value: 'flutter', label: 'Flutter' },
    { value: 'aem', label: 'AEM - Adobe Experience Manager' },
    { value: 'ionic', label: 'Ionic' }
  ];

  const roles = [
    { value: 'junior', label: 'Mobile Junior Developer (1-2 years)' },
    { value: 'mid', label: 'Mobile Mid-Level Developer (2-4 years)' },
    { value: 'senior', label: 'Mobile Senior Developer (3-5 years)' },
    { value: 'lead', label: 'Mobile Lead (5-8 years)' },
    { value: 'architect', label: 'Mobile Architect (8+ years)' }
  ];

  const normalizeRoleValue = (value: string) => {
    const normalizedValue = String(value || '').toLowerCase();
    if (normalizedValue.includes('architect')) return 'architect';
    if (normalizedValue.includes('lead')) return 'lead';
    if (normalizedValue.includes('senior')) return 'senior';
    if (normalizedValue.includes('mid')) return 'mid';
    if (normalizedValue.includes('junior')) return 'junior';
    return normalizedValue;
  };

  useEffect(() => {
    const loadActiveProfiles = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/customer-profiles/active`);
        if (!response.ok) return;
        const body = await readJsonResponse(response, 'Active customer profiles response was not JSON');
        setActiveProfiles(body.profiles || []);
      } catch (error) {
        console.warn('Unable to load active customer profiles', error);
      }
    };

    loadActiveProfiles();
  }, []);

  const handleCustomerProfileChange = (profileId: string) => {
    const selectedProfile = activeProfiles.find(profile => profile.id === profileId);
    if (!selectedProfile) {
      setFormData(prev => ({
        ...prev,
        customerProjectProfile: undefined
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      customerProjectProfile: selectedProfile,
      technology: selectedProfile.technologyStack || selectedProfile.technology || prev.technology,
      domain: selectedProfile.clientDomain || selectedProfile.domain || prev.domain,
      role: normalizeRoleValue(selectedProfile.roleRequirements || prev.role || '')
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.candidateName.trim()) {
      newErrors.candidateName = 'Candidate name is required';
    }

    if (!formData.technology) {
      newErrors.technology = 'Please select a technology';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role level';
    }

    if (
      formData.customerProjectProfile?.roleLevelMapping &&
      !formData.customerProjectProfile.roleLevelMapping[formData.role]
    ) {
      newErrors.role = 'Selected customer profile is not mapped to this role level';
    }

    if (!formData.interviewDate) {
      newErrors.interviewDate = 'Interview date is required';
    }

    if (!formData.interviewTime) {
      newErrors.interviewTime = 'Interview time is required';
    }

    if (!formData.domain) {
      newErrors.domain = 'Domain is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      console.log('Interview Data:', formData);
      onStart(formData);
    }
  };

  if (showInterview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9] mb-6">
            <ChevronRight size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Setup Complete!
          </h2>
          <p className="text-gray-600 text-lg mb-2">
            Interview scheduled for <strong>{formData.candidateName}</strong>
          </p>
          <p className="text-gray-500 mb-8">
            {technologies.find(t => t.value === formData.technology)?.label} • {roles.find(r => r.value === formData.role)?.label}
          </p>
          <div className="bg-indigo-50 rounded-xl p-4 mb-6">
            <p className="text-indigo-900 font-medium">
              {new Date(formData.interviewDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} at {formData.interviewTime}
            </p>
          </div>
          <p className="text-gray-500 text-sm">
            Now redirecting to Interview Agent...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9]">
      <header className="bg-gradient-to-b from-[#4779f2] via-[#7747d5] to-[#5f32c6] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white">
              Welcome to AI interview Agent
            </h1>
            <p className="text-white/90 mt-2 text-lg">
              your interview session details
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9] px-8 py-6">
            <h2 className="text-2xl font-bold text-gray-900">Candidate information</h2>
            <p className="text-gray-600 mt-1">Please verify below details are correct and start the interview or contact helpline number</p>
          </div>

          <div className="p-8 space-y-6">
            {formData.customerProjectProfile && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
                <div className="text-sm font-bold uppercase text-indigo-700 mb-1">
                  Customer-specific KM active
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {formData.customerProjectProfile.customerName} - {formData.customerProjectProfile.projectName}
                </div>
                <p className="mt-1 text-gray-700">
                  Questions will be tailored using the local mock Teams KM profile until Microsoft MCP / Graph access is enabled.
                </p>
              </div>
            )}

            {activeProfiles.length > 0 && (
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <Briefcase size={18} className="mr-2 text-indigo-600" />
                  Customer Profile
                </label>
                <select
                  value={formData.customerProjectProfile?.id || ''}
                  onChange={(e) => handleCustomerProfileChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="">No customer profile / generic interview</option>
                  {activeProfiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.customerName} - {profile.projectName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <User size={18} className="mr-2 text-indigo-600" />
                Candidate Name
              </label>
              <input
                type="text"
                value={formData.candidateName}
                onChange={(e) => handleInputChange('candidateName', e.target.value)}
                disabled={isPrefilled}
                placeholder="Enter full name"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.candidateName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.candidateName && (
                <p className="mt-1 text-sm text-red-600">{errors.candidateName}</p>
              )}
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <Code size={18} className="mr-2 text-indigo-600" />
                Technology
              </label>
              <select
                value={formData.technology}
                onChange={(e) => handleInputChange('technology', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.technology ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select a technology</option>
                {technologies.map(tech => (
                  <option key={tech.value} value={tech.value}>
                    {tech.label}
                  </option>
                ))}
              </select>
              {errors.technology && (
                <p className="mt-1 text-sm text-red-600">{errors.technology}</p>
              )}
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <Award size={18} className="mr-2 text-indigo-600" />
                Role Level
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors.role ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select a role level</option>
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <Briefcase size={18} className="mr-2 text-indigo-600" />
                Domain
              </label>
              <input
                type="text"
                value={formData.domain || ''}
                onChange={(e) => handleInputChange('domain', e.target.value)}
                placeholder="Domain"
                disabled={isPrefilled}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  errors?.domain ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors?.domain && (
                <p className="mt-1 text-sm text-red-600">{errors.domain}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <Calendar size={18} className="mr-2 text-indigo-600" />
                  Interview Date
                </label>
                <input
                  type="date"
                  value={formData.interviewDate}
                  onChange={(e) => handleInputChange('interviewDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                    errors.interviewDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.interviewDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.interviewDate}</p>
                )}
              </div>

              <div>
                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                  <Clock size={18} className="mr-2 text-indigo-600" />
                  Interview Time
                </label>
                <input
                  type="time"
                  value={formData.interviewTime}
                  onChange={(e) => handleInputChange('interviewTime', e.target.value)}
                  disabled={isPrefilled}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                    errors.interviewTime ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.interviewTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.interviewTime}</p>
                )}
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={handleSubmit}
                className="w-full bg-[#5f1fbe] text-white py-4 px-6 rounded-xl hover:bg-[#4a1696] transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center text-lg font-semibold"
              >
                Start Interview
                <ChevronRight size={24} className="ml-2" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              The AI will customize questions based on the selected technology and role level
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              You can respond via voice recording or text input
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Receive feedback and scoring after complete all the questions.
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Get a comprehensive performance report at the end
            </li>
          </ul>
        </div>
      </main>

      <footer className="mt-12 pb-8 text-center text-gray-500 text-sm">
        © 2026 AI Interview Agent - Powered by HCLTech
      </footer>
    </div>
  );
}
