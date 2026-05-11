package com.wealthpulse.app;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.provider.ContactsContract;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "Contacts",
    permissions = {
        @Permission(
            alias = "contacts",
            strings = {Manifest.permission.READ_CONTACTS}
        )
    }
)
public class ContactsPlugin extends Plugin {

    private static final String TAG = "WP_CONTACTS";

    // Standard UPI MIME types used by popular apps in India
    private static final String MIME_GPAY    = "vnd.android.cursor.item/com.google.android.apps.tez.user";
    private static final String MIME_PHONEPE = "vnd.android.cursor.item/vnd.phonepe.invite";
    private static final String MIME_PAYTM   = "vnd.android.cursor.item/vnd.one97.paytm";
    private static final String MIME_BHIM    = "vnd.android.cursor.item/vnd.npci.bhim";

    @PluginMethod
    public void searchContacts(PluginCall call) {
        if (getPermissionState("contacts") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("contacts", call, "contactsPermCallback");
        } else {
            executeSearch(call);
        }
    }

    @PermissionCallback
    private void contactsPermCallback(PluginCall call) {
        if (getPermissionState("contacts") == com.getcapacitor.PermissionState.GRANTED) {
            executeSearch(call);
        } else {
            call.reject("Permission required to read contacts");
        }
    }

    private void executeSearch(PluginCall call) {
        String query = call.getString("query", "");
        Log.d(TAG, "Executing search for: " + query);
        ContentResolver cr = getContext().getContentResolver();
        JSArray results = new JSArray();

        // Use DISPLAY_NAME for wider compatibility across Android versions
        String selection = ContactsContract.Contacts.DISPLAY_NAME + " LIKE ?";
        String[] selectionArgs = new String[]{"%" + query + "%"};
        
        Cursor cur = cr.query(
            ContactsContract.Contacts.CONTENT_URI,
            new String[]{
                ContactsContract.Contacts._ID,
                ContactsContract.Contacts.DISPLAY_NAME,
                ContactsContract.Contacts.PHOTO_THUMBNAIL_URI
            },
            selection,
            selectionArgs,
            ContactsContract.Contacts.DISPLAY_NAME + " ASC LIMIT 50"
        );

        if (cur != null) {
            Log.d(TAG, "Found " + cur.getCount() + " matching contacts");
            int idIdx = cur.getColumnIndex(ContactsContract.Contacts._ID);
            int nameIdx = cur.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME);
            int avatarIdx = cur.getColumnIndex(ContactsContract.Contacts.PHOTO_THUMBNAIL_URI);

            while (cur.moveToNext()) {
                String id = cur.getString(idIdx);
                String name = cur.getString(nameIdx);
                String avatar = (avatarIdx != -1) ? cur.getString(avatarIdx) : null;

                JSObject contact = new JSObject();
                contact.put("id", id);
                contact.put("name", name);
                contact.put("avatar", avatar);

                // 2. Fetch phone number
                Cursor pCur = cr.query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER},
                    ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = ?",
                    new String[]{id}, null
                );
                if (pCur != null) {
                    if (pCur.moveToFirst()) {
                        contact.put("phone", pCur.getString(0));
                    }
                    pCur.close();
                }

                // 3. Fetch UPI ID from custom MIME types
                Cursor dCur = cr.query(
                    ContactsContract.Data.CONTENT_URI,
                    new String[]{ContactsContract.Data.MIMETYPE, ContactsContract.Data.DATA1},
                    ContactsContract.Data.CONTACT_ID + " = ? AND (" +
                        ContactsContract.Data.MIMETYPE + " = ? OR " +
                        ContactsContract.Data.MIMETYPE + " = ? OR " +
                        ContactsContract.Data.MIMETYPE + " = ? OR " +
                        ContactsContract.Data.MIMETYPE + " = ?)",
                    new String[]{id, MIME_GPAY, MIME_PHONEPE, MIME_PAYTM, MIME_BHIM},
                    null
                );

                if (dCur != null) {
                    while (dCur.moveToNext()) {
                        String mime = dCur.getString(0);
                        String upiId = dCur.getString(1);

                        if (upiId != null && !upiId.isEmpty()) {
                            contact.put("upiId", upiId);
                            if (mime.equals(MIME_GPAY)) contact.put("upiApp", "GPay");
                            else if (mime.equals(MIME_PHONEPE)) contact.put("upiApp", "PhonePe");
                            else if (mime.equals(MIME_PAYTM)) contact.put("upiApp", "Paytm");
                            else if (mime.equals(MIME_BHIM)) contact.put("upiApp", "BHIM");
                            break; // Stop at first UPI ID found for now
                        }
                    }
                    dCur.close();
                }

                results.put(contact);
            }
            cur.close();
        }

        JSObject response = new JSObject();
        response.put("contacts", results);
        call.resolve(response);
    }

    @PluginMethod
    public void getContact(PluginCall call) {
        String contactId = call.getString("contactId");
        if (contactId == null) {
            call.reject("contactId is required");
            return;
        }
        // Simplified implementation to return single contact by ID
        // Reuse executeSearch logic or similar
        call.resolve(new JSObject()); // Placeholder
    }
}
