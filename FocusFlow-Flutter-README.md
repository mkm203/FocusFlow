# FocusFlow (Flutter) setup

1. From the root of your FocusFlow repo, create the Flutter project shell (makes android/, ios/, web/ ...):
   flutter create --project-name focusflow_app --org cm.focusflow focusflow_app

2. Unzip this package so that focusflow_app\lib and focusflow_app\pubspec.yaml REPLACE the generated ones.
   Delete focusflow_app\test\widget_test.dart (the generated test refers to the default counter app).

3. Android only: allow plain http to your PC. Open focusflow_app\android\app\src\main\AndroidManifest.xml and add one attribute to <application ...>:
       android:usesCleartextTraffic="true"

4. In focusflow_app:
       flutter pub get
       flutter analyze
       flutter run

5. Backend: XAMPP MySQL started, then in focus-flow-backend run "npm run dev" (port 5001).
   - Android emulator: the app already uses http://10.0.2.2:5001
   - Real phone on the same Wi-Fi: open Backup tab > Server address > http://<your PC IP>:5001 (run ipconfig to find it)
   - Windows firewall: allow Node.js on private networks.
