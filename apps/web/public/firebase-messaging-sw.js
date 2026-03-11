importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// Environment variables are not easily exposed here without a build step,
// so this will be a placeholder that developers must fill with their public config.
// Or we can use the URL query strategy. For this app, relying on standard static config is best.

const firebaseConfig = {
    // This MUST be replaced with actual Firebase Project public config
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log(
        "[firebase-messaging-sw.js] Received background message ",
        payload
    );

    const notificationTitle = payload.notification?.title || "VocaFit";
    const notificationOptions = {
        body: payload.notification?.body,
        icon: "/icon512_maskable.png", // Path to app icon
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
