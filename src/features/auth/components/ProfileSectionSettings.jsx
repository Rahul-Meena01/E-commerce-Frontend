import { Bell, Shield, KeyRound, Moon, Eye, LogOut } from "lucide-react";

const ProfileSectionSettings = ({ settings, toggleSetting, handleLogout, isLoggingOut }) => {
  return (
    <div className="profile-section-settings">
      <div className="profile-section-header">
        <h2 className="profile-section-title">Account Settings</h2>
        <p className="profile-section-subtitle">
          Manage your account preferences
        </p>
      </div>

      <div className="profile-settings-group">
        <h3 className="profile-settings-group-title">Notifications</h3>
        <div className="profile-setting-row">
          <div className="profile-setting-content">
            <div className="profile-setting-icon">
              <Bell size={18} />
            </div>
            <div>
              <h4 className="profile-setting-label">Email Notifications</h4>
              <p className="profile-setting-description">
                Receive updates about orders and promotions
              </p>
            </div>
          </div>
          <div className="profile-toggle-switch">
            <input
              type="checkbox"
              id="email-notifications"
              checked={settings.emailNotifications}
              onChange={() => toggleSetting("emailNotifications")}
            />
            <label htmlFor="email-notifications" />
          </div>
        </div>
      </div>

      <div className="profile-settings-group">
        <h3 className="profile-settings-group-title">Security</h3>
        <div className="profile-setting-row">
          <div className="profile-setting-content">
            <div className="profile-setting-icon">
              <Shield size={18} />
            </div>
            <div>
              <h4 className="profile-setting-label">
                Two-Factor Authentication
              </h4>
              <p className="profile-setting-description">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          <div className="profile-toggle-switch">
            <input
              type="checkbox"
              id="two-factor"
              checked={settings.twoFactorAuth}
              onChange={() => toggleSetting("twoFactorAuth")}
            />
            <label htmlFor="two-factor" />
          </div>
        </div>

        <div className="profile-setting-row">
          <div className="profile-setting-content">
            <div className="profile-setting-icon">
              <KeyRound size={18} />
            </div>
            <div>
              <h4 className="profile-setting-label">Change Password</h4>
              <p className="profile-setting-description">
                Update your password regularly for security
              </p>
            </div>
          </div>
          <button className="profile-settings-action-btn">Update</button>
        </div>
      </div>

      <div className="profile-settings-group">
        <h3 className="profile-settings-group-title">Preferences</h3>
        <div className="profile-setting-row">
          <div className="profile-setting-content">
            <div className="profile-setting-icon">
              <Moon size={18} />
            </div>
            <div>
              <h4 className="profile-setting-label">Dark Mode</h4>
              <p className="profile-setting-description">Coming soon</p>
            </div>
          </div>
          <div className="profile-toggle-switch disabled">
            <input
              type="checkbox"
              id="dark-mode"
              disabled
              checked={settings.darkMode}
              onChange={() => toggleSetting("darkMode")}
            />
            <label htmlFor="dark-mode" />
          </div>
        </div>

        <div className="profile-setting-row">
          <div className="profile-setting-content">
            <div className="profile-setting-icon">
              <Eye size={18} />
            </div>
            <div>
              <h4 className="profile-setting-label">Profile Visibility</h4>
              <p className="profile-setting-description">
                Control who can see your profile
              </p>
            </div>
          </div>
          <div className="profile-toggle-switch">
            <input
              type="checkbox"
              id="privacy-public"
              checked={settings.privacyPublic}
              onChange={() => toggleSetting("privacyPublic")}
            />
            <label htmlFor="privacy-public" />
          </div>
        </div>

        <div className="profile-setting-row profile-setting-row-logout">
          <div className="profile-setting-content">
            <div className="profile-setting-icon">
              <LogOut size={18} />
            </div>
            <div>
              <h4 className="profile-setting-label">Logout</h4>
              <p className="profile-setting-description">
                Sign out of your Loft account on this device
              </p>
            </div>
          </div>
          <button
            type="button"
            className="profile-settings-action-btn profile-logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSectionSettings;
