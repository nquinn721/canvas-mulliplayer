// Google One Tap Integration for Canvas Multiplayer Game
// This provides a faster, seamless Google login experience

export class GoogleOneTapService {
  private clientId: string;
  private isInitialized: boolean = false;

  constructor() {
    // Use the same Google Client ID as OAuth
    this.clientId = process.env.NODE_ENV === "production" 
      ? "your-production-google-client-id"  // Replace with actual
      : "your-dev-google-client-id";        // Replace with actual
  }

  // Initialize Google One Tap
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      // Load Google Identity Services library
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this.setupOneTap();
        this.isInitialized = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google One Tap'));
      document.head.appendChild(script);
    });
  }

  private setupOneTap(): void {
    // @ts-ignore - Google Identity Services types
    google.accounts.id.initialize({
      client_id: this.clientId,
      callback: this.handleCredentialResponse.bind(this),
      auto_select: false, // Don't auto-select on return visits
      cancel_on_tap_outside: true,
    });

    // Show the One Tap prompt
    // @ts-ignore
    google.accounts.id.prompt((notification: any) => {
      console.log('One Tap notification:', notification.getNotDisplayedReason());
    });
  }

  // Handle the credential response from Google One Tap
  private async handleCredentialResponse(response: any): Promise<void> {
    try {
      console.log('Google One Tap response:', response);
      
      // Send the credential token to your backend
      const result = await fetch('/api/auth/google/one-tap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential
        })
      });

      if (result.ok) {
        const data = await result.json();
        if (data.success && data.data?.token) {
          // Store auth token and redirect to lobby
          localStorage.setItem('authToken', data.data.token);
          localStorage.setItem('authUser', JSON.stringify(data.data.user));
          window.location.href = '/lobby';
        }
      }
    } catch (error) {
      console.error('One Tap authentication failed:', error);
    }
  }

  // Show One Tap manually (e.g., on button click)
  showOneTap(): void {
    if (!this.isInitialized) {
      console.error('Google One Tap not initialized');
      return;
    }
    // @ts-ignore
    google.accounts.id.prompt();
  }

  // Render the One Tap button
  renderButton(elementId: string): void {
    if (!this.isInitialized) {
      console.error('Google One Tap not initialized');
      return;
    }

    // @ts-ignore
    google.accounts.id.renderButton(
      document.getElementById(elementId),
      {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
      }
    );
  }
}
