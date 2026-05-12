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
    private static final int MAX_RESULTS = 50;

    // Standard UPI MIME types used by popular apps in India
    private static final String MIME_GPAY    = "vnd.android.cursor.item/com.google.android.apps.tez.user";
    private static final String MIME_PHONEPE = "vnd.android.cursor.item/vnd.phonepe.invite";
    private static final String MIME_PAYTM   = "vnd.android.cursor.item/vnd.one97.paytm";
    private static final String MIME_BHIM    = "vnd.android.cursor.item/vnd.npci.bhim";

    // ── searchContacts ─────────────────────────────────────────────
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
            call.reject("contacts_permission_denied");
        }
    }

    private void executeSearch(PluginCall call) {
        String query = call.getString("query", "");
        Log.d(TAG, "Searching contacts: " + query);

        ContentResolver cr = getContext().getContentResolver();
        JSArray results = new JSArray();

        Cursor cur = cr.query(
            ContactsContract.Contacts.CONTENT_URI,
            new String[]{
                ContactsContract.Contacts._ID,
                ContactsContract.Contacts.DISPLAY_NAME,
                ContactsContract.Contacts.PHOTO_THUMBNAIL_URI
            },
            ContactsContract.Contacts.DISPLAY_NAME + " LIKE ?",
            new String[]{"%" + query + "%"},
            ContactsContract.Contacts.DISPLAY_NAME + " ASC"  // No LIMIT here — trim in Java
        );

        if (cur != null) {
            Log.d(TAG, "Raw matches: " + cur.getCount());

            int idIdx     = cur.getColumnIndex(ContactsContract.Contacts._ID);
            int nameIdx   = cur.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME);
            int avatarIdx = cur.getColumnIndex(ContactsContract.Contacts.PHOTO_THUMBNAIL_URI);
            int count = 0;

            while (cur.moveToNext() && count < MAX_RESULTS) {
                String id     = cur.getString(idIdx);
                String name   = cur.getString(nameIdx);
                String avatar = (avatarIdx != -1) ? cur.getString(avatarIdx) : null;

                if (name == null || name.trim().isEmpty()) continue;

                JSObject contact = new JSObject();
                contact.put("id", id);
                contact.put("name", name.trim());
                contact.put("avatar", avatar);

                // Phone number
                fetchPhone(cr, id, contact);

                // UPI ID from custom MIME types
                fetchUpiId(cr, id, contact);

                results.put(contact);
                count++;
            }
            cur.close();
            Log.d(TAG, "Returning " + count + " contacts");
        }

        JSObject response = new JSObject();
        response.put("contacts", results);
        call.resolve(response);
    }

    // ── getContact ─────────────────────────────────────────────────
    @PluginMethod
    public void getContact(PluginCall call) {
        if (getPermissionState("contacts") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("contacts_permission_denied");
            return;
        }

        String contactId = call.getString("contactId");
        if (contactId == null || contactId.isEmpty()) {
            call.reject("contactId is required");
            return;
        }

        ContentResolver cr = getContext().getContentResolver();

        Cursor cur = cr.query(
            ContactsContract.Contacts.CONTENT_URI,
            new String[]{
                ContactsContract.Contacts._ID,
                ContactsContract.Contacts.DISPLAY_NAME,
                ContactsContract.Contacts.PHOTO_THUMBNAIL_URI
            },
            ContactsContract.Contacts._ID + " = ?",
            new String[]{contactId},
            null
        );

        if (cur != null && cur.moveToFirst()) {
            int idIdx     = cur.getColumnIndex(ContactsContract.Contacts._ID);
            int nameIdx   = cur.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME);
            int avatarIdx = cur.getColumnIndex(ContactsContract.Contacts.PHOTO_THUMBNAIL_URI);

            String id     = cur.getString(idIdx);
            String name   = cur.getString(nameIdx);
            String avatar = (avatarIdx != -1) ? cur.getString(avatarIdx) : null;

            JSObject contact = new JSObject();
            contact.put("id", id);
            contact.put("name", name != null ? name.trim() : "");
            contact.put("avatar", avatar);

            fetchPhone(cr, id, contact);
            fetchUpiId(cr, id, contact);

            cur.close();

            JSObject response = new JSObject();
            response.put("contact", contact);
            call.resolve(response);
        } else {
            if (cur != null) cur.close();
            call.reject("Contact not found");
        }
    }

    // ── Helpers ────────────────────────────────────────────────────

    private void fetchPhone(ContentResolver cr, String contactId, JSObject contact) {
        Cursor pCur = cr.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER},
            ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = ?",
            new String[]{contactId},
            null
        );
        if (pCur != null) {
            if (pCur.moveToFirst()) {
                String phone = pCur.getString(0);
                if (phone != null) {
                    // Normalise: remove spaces/dashes, keep + prefix
                    phone = phone.replaceAll("[\\s\\-()]", "");
                    contact.put("phone", phone);
                }
            }
            pCur.close();
        }
    }

    private void fetchUpiId(ContentResolver cr, String contactId, JSObject contact) {
        Cursor dCur = cr.query(
            ContactsContract.Data.CONTENT_URI,
            new String[]{ContactsContract.Data.MIMETYPE, ContactsContract.Data.DATA1},
            ContactsContract.Data.CONTACT_ID + " = ? AND (" +
                ContactsContract.Data.MIMETYPE + " = ? OR " +
                ContactsContract.Data.MIMETYPE + " = ? OR " +
                ContactsContract.Data.MIMETYPE + " = ? OR " +
                ContactsContract.Data.MIMETYPE + " = ?)",
            new String[]{contactId, MIME_GPAY, MIME_PHONEPE, MIME_PAYTM, MIME_BHIM},
            null
        );

        if (dCur != null) {
            while (dCur.moveToNext()) {
                String mime  = dCur.getString(0);
                String upiId = dCur.getString(1);
                if (upiId != null && !upiId.trim().isEmpty()) {
                    contact.put("upiId", upiId.trim());
                    if (mime.equals(MIME_GPAY))    contact.put("upiApp", "GPay");
                    else if (mime.equals(MIME_PHONEPE)) contact.put("upiApp", "PhonePe");
                    else if (mime.equals(MIME_PAYTM))   contact.put("upiApp", "Paytm");
                    else if (mime.equals(MIME_BHIM))    contact.put("upiApp", "BHIM");
                    break; // First UPI ID found wins
                }
            }
            dCur.close();
        }
    }
}
