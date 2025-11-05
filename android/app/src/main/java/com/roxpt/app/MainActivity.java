package com.roxpt.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d("MainActivity", "Registering AppHealthPlugin...");
        // CRITICAL: Register BEFORE super.onCreate()
        registerPlugin(AppHealthPlugin.class);
        
        super.onCreate(savedInstanceState);
        Log.d("MainActivity", "MainActivity onCreate finished");
    }
}
