
# Auth and Login

Auth and login into the site are key requirements.   There are many options:

1. Completely federated auth - ie login with X.
2. Username based auth - users create a custom user name.
3. Email based auth - Users login via magic links sent to users.
4. Phone based auth - Login via PIN codes sent to phone numbers.
5. Combination of the above.

(1) makes it easy to not require a registration step - but risks user getting locked out etc.
(2) is easiest but user can forget usernames easily and may create new usernames.  Worse users may lose out on songs they used if they forget their username.  The username needs to be either tied to a phone or an email.
(3) Email and Phone are better since they are unencumbered by any providers (technically gmail accounts etc can be disabled)

Ideally we want some combination of above so users have a fallback - via username but can recover accounts using phone or email and have an easy registration via federated login.

For this purpose we have seperated login "Channels" from users.

A channel is essentially an object that contains a token pertaining to a valid login - either locally via id/password or via a token (email/phone based codes) or even federated logins.

Once a channel is created successfully (and multiple channels can be valid at a given time) a user is implicitly created for each channel.  This user is the real authenticated user for the rest of the session.

The channel's ID is deterministic.  It consists of a provider + provider specific ID.  eg whtn Signin with Google is used, the channel is something like "google:<mail address>".  Same thing with facebook or github login.  So if a user logs in 3 times, once with google, once with facebook and once with github, three different users are created.
