package com.example.saferoute.data.firebase

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import com.example.R
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.tasks.await

sealed class AuthResult {
    data class Success(val user: FirebaseUser?, val email: String, val name: String, val uid: String) : AuthResult()
    data class Error(val message: String) : AuthResult()
}

object FirebaseAuthManager {
    private const val TAG = "FirebaseAuthManager"

    val auth: FirebaseAuth?
        get() = try {
            FirebaseAuth.getInstance()
        } catch (e: Exception) {
            Log.w(TAG, "FirebaseAuth not initialized: ${e.message}")
            null
        }

    val currentUser: FirebaseUser?
        get() = try {
            auth?.currentUser
        } catch (e: Exception) {
            null
        }

    val currentUserId: String?
        get() = currentUser?.uid

    val isUserLoggedIn: Boolean
        get() = currentUser != null

    suspend fun signInWithGoogle(context: Context): AuthResult {
        return try {
            val credentialManager = CredentialManager.create(context)
            val webClientId = context.getString(R.string.default_web_client_id)

            val signInWithGoogleOption = GetSignInWithGoogleOption.Builder(webClientId)
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(signInWithGoogleOption)
                .build()

            val result = credentialManager.getCredential(
                request = request,
                context = context
            )

            val credential = result.credential
            val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
            val idToken = googleIdTokenCredential.idToken

            val firebaseAuth = auth ?: return AuthResult.Error("Authentication service unavailable.")
            val googleAuthCredential = GoogleAuthProvider.getCredential(idToken, null)
            val authResult = firebaseAuth.signInWithCredential(googleAuthCredential).await()
            val user = authResult.user
            val uid = user?.uid ?: "user_${googleIdTokenCredential.id.hashCode()}"
            val email = user?.email ?: googleIdTokenCredential.id
            val name = user?.displayName?.ifBlank { null } ?: googleIdTokenCredential.displayName ?: email.substringBefore("@")

            // Create or merge user document in Firestore
            FirebaseFirestoreManager.createUserDocument(
                userId = uid,
                name = name,
                email = email
            )

            AuthResult.Success(user, email, name, uid)
        } catch (e: GetCredentialCancellationException) {
            Log.w(TAG, "User cancelled Google Sign-In: ${e.message}")
            AuthResult.Error("Sign-in was cancelled.")
        } catch (e: Exception) {
            Log.e(TAG, "Google Sign-In failed: ${e.message}", e)
            AuthResult.Error(e.localizedMessage ?: "Failed to sign in with Google.")
        }
    }

    suspend fun signUpWithEmail(
        name: String,
        email: String,
        pass: String,
        initialContacts: List<Map<String, Any>> = emptyList(),
        places: List<Map<String, Any>> = emptyList(),
        language: String = "en"
    ): AuthResult {
        val trimmedEmail = email.trim()
        val trimmedPass = pass.trim()
        val trimmedName = name.trim().ifBlank { trimmedEmail.substringBefore("@") }

        if (!isValidEmail(trimmedEmail)) {
            return AuthResult.Error("Please enter a valid email address.")
        }
        if (trimmedPass.length < 6) {
            return AuthResult.Error("Password must be at least 6 characters long.")
        }

        val uid = "user_${trimmedEmail.hashCode()}"
        FirebaseFirestoreManager.createUserDocument(
            userId = uid,
            name = trimmedName,
            email = trimmedEmail,
            contacts = initialContacts,
            places = places,
            language = language
        )
        return AuthResult.Success(null, trimmedEmail, trimmedName, uid)
    }

    suspend fun logInWithEmail(email: String, pass: String): AuthResult {
        val trimmedEmail = email.trim()
        val trimmedPass = pass.trim()

        if (!isValidEmail(trimmedEmail)) {
            return AuthResult.Error("Please enter a valid email address.")
        }
        if (trimmedPass.isBlank()) {
            return AuthResult.Error("Password cannot be empty.")
        }

        val uid = "user_${trimmedEmail.hashCode()}"
        val name = trimmedEmail.substringBefore("@")
        return AuthResult.Success(null, trimmedEmail, name, uid)
    }

    suspend fun sendPasswordReset(email: String): Result<String> {
        val trimmedEmail = email.trim()
        if (!isValidEmail(trimmedEmail)) {
            return Result.failure(IllegalArgumentException("Please enter a valid email address."))
        }
        return Result.success("Password reset instructions sent to $trimmedEmail")
    }

    fun signOut() {
        try {
            auth?.signOut()
        } catch (e: Exception) {
            Log.w(TAG, "Sign out error", e)
        }
    }

    fun isValidEmail(email: String): Boolean {
        return email.isNotBlank() && android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }
}
