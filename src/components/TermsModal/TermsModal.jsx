import React, { useState, useEffect, useRef } from 'react'
import './TermsModal.css'

const TermsModal = ({ isOpen, onClose, onAccept, type = 'terms' }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const scrollContainerRef = useRef(null)

  const isTerms = type === 'terms'
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy'

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false)
      setIsChecked(false)
    }
  }, [isOpen])

  // Handle scroll to detect when user reaches bottom
  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Allow 10px tolerance for reaching bottom
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      
      if (isAtBottom && !hasScrolledToBottom) {
        setHasScrolledToBottom(true)
      }
    }
  }

  const handleAccept = () => {
    if (hasScrolledToBottom && isChecked) {
      onAccept(type)
      onClose()
    }
  }

  const handleCheckboxChange = (e) => {
    setIsChecked(e.target.checked)
  }

  if (!isOpen) return null

  return (
    <div className="terms-modal-overlay" onClick={onClose}>
      <div className="terms-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="terms-modal-header">
          <h2>{title}</h2>
          <button className="terms-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div 
          className="terms-modal-content"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          {isTerms ? (
            <div className="terms-content">
              <h3>1. Acceptance of Terms</h3>
              <p>By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement.</p>

              <h3>2. Use License</h3>
              <p>Permission is granted to temporarily download one copy of the materials on our website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
              <ul>
                <li>modify or copy the materials;</li>
                <li>use the materials for any commercial purpose or for any public display (commercial or non-commercial);</li>
                <li>attempt to decompile or reverse engineer any software contained on our website;</li>
                <li>remove any copyright or other proprietary notations from the materials.</li>
              </ul>

              <h3>3. Disclaimer</h3>
              <p>The materials on our website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>

              <h3>4. Limitations</h3>
              <p>In no event shall Firebase Clone or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website, even if Firebase Clone or an authorized representative has been notified orally or in writing of the possibility of such damage. Because some jurisdictions do not allow limitations on implied warranties, or limitations of liability for consequential or incidental damages, these limitations may not apply to you.</p>

              <h3>5. Accuracy of Materials</h3>
              <p>The materials appearing on our website could include technical, typographical, or photographic errors. We do not warrant that any of the materials on its website are accurate, complete, or current. We may make changes to the materials contained on its website at any time without notice. However, we do not make any commitment to update the materials.</p>

              <h3>6. Links</h3>
              <p>We have not reviewed all of the sites linked to our website and are not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by us of the site. Use of any such linked website is at the user's own risk.</p>

              <h3>7. Modifications</h3>
              <p>We may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.</p>

              <h3>8. Governing Law</h3>
              <p>These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which our company is established and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.</p>

              <h3>9. Account Security</h3>
              <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer or device. You agree to accept responsibility for all activities that occur under your account or password.</p>

              <h3>10. Prohibited Uses</h3>
              <p>You may not use our service:</p>
              <ul>
                <li>for any unlawful purpose or to solicit others to perform illegal acts;</li>
                <li>to violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances;</li>
                <li>to infringe upon or violate our intellectual property rights or the intellectual property rights of others;</li>
                <li>to harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate;</li>
                <li>to submit false or misleading information;</li>
                <li>to upload or transmit viruses or any other type of malicious code.</li>
              </ul>

              <h3>11. Termination</h3>
              <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the service will cease immediately.</p>

              <h3>12. Contact Information</h3>
              <p>If you have any questions about these Terms of Service, please contact us at legal@firebaseclone.com</p>

              <p className="terms-footer">Last updated: July 1, 2025</p>
            </div>
          ) : (
            <div className="privacy-content">
              <h3>1. Information We Collect</h3>
              <p>We collect information you provide directly to us, such as when you create an account, update your profile, or contact us for support.</p>

              <h3>2. How We Use Your Information</h3>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Provide, maintain, and improve our services;</li>
                <li>Process transactions and send related information;</li>
                <li>Send you technical notices, updates, security alerts, and support messages;</li>
                <li>Respond to your comments, questions, and customer service requests;</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our services.</li>
              </ul>

              <h3>3. Information Sharing</h3>
              <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this privacy policy.</p>

              <h3>4. Data Security</h3>
              <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

              <h3>5. Cookies and Tracking</h3>
              <p>We use cookies and similar tracking technologies to track activity on our service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>

              <h3>6. Data Retention</h3>
              <p>We retain your personal information for as long as necessary to provide you with our services and as described in this privacy policy. We also retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our policies.</p>

              <h3>7. Your Rights</h3>
              <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
              <ul>
                <li>The right to access your personal information;</li>
                <li>The right to rectify inaccurate personal information;</li>
                <li>The right to erase your personal information;</li>
                <li>The right to restrict processing of your personal information;</li>
                <li>The right to data portability.</li>
              </ul>

              <h3>8. Children's Privacy</h3>
              <p>Our service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.</p>

              <h3>9. International Data Transfers</h3>
              <p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this privacy policy.</p>

              <h3>10. Third-Party Services</h3>
              <p>Our service may contain links to third-party websites or services that are not owned or controlled by us. We are not responsible for the privacy practices of these third parties.</p>

              <h3>11. Changes to Privacy Policy</h3>
              <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date.</p>

              <h3>12. Contact Us</h3>
              <p>If you have any questions about this Privacy Policy, please contact us at privacy@firebaseclone.com</p>

              <p className="privacy-footer">Last updated: July 1, 2025</p>
            </div>
          )}
        </div>

        <div className="terms-modal-footer">
          {!hasScrolledToBottom && (
            <div className="scroll-indicator">
              <span className="scroll-icon">↓</span>
              <p>Please scroll down to read the entire {title.toLowerCase()}</p>
            </div>
          )}
          
          <div className={`agreement-section ${hasScrolledToBottom ? 'enabled' : 'disabled'}`}>
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={handleCheckboxChange}
                disabled={!hasScrolledToBottom}
              />
              <span className="checkmark"></span>
              <span className="checkbox-text">
                I have read and agree to the {title}
              </span>
            </label>
          </div>

          <div className="modal-actions">
            <button 
              className="cancel-btn" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className={`accept-btn ${hasScrolledToBottom && isChecked ? 'enabled' : 'disabled'}`}
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || !isChecked}
            >
              Accept & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsModal