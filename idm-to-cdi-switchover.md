# IdM to Cdi switchover proposal

## Overview

As of Sep 22,  Idm <-> email mappings work is complete. CSV mappings and user provided (and verified) emails are being stored by ALeA. However, the primary user idenitifier is still the IdMId. After the switch, ALeA's primary identifier is going to be the user's email address (@fau.de only if not using email-password flow)

## JWT Token
The JWT token currently `user_id` contains the IdM identifier. After the switch, this field will be retired and any tokens using this field will be invalid.

The token will return the CDI id in a new field (say, `cdiId`). The token will also stop populating names (`givenName`, `sn` etc). New token structure for cdi flow:
```
{
    cdiId: string;    // new
    issued: number; // no change
    // givenName, sn no longer returneds
}
```

Token structure for email-password users, minted using `get-email-access-token` API,  changes like so:
```
{
    "email": string, // was user_id
    "issued": number, // no change
    // givenName, sn no longer returned
}
```

Token structure for fake user, minted using `fake-login` API:
```
{
    fakeId: string,
    issued: number
    // givenName, sn no longer returned
}
```

LMS `getuserinfo` must return these objects. ALeA reads that response. It does not read the token itself. A response that still contains `user_id` is rejected by the LMS and by ALeA.

ALeA will collect the user's name (not verified) and email (verified).

## Data loss

ALeA does not have a way to turn an IdM identifier into a Cdi identifier. The only join is the email address. ALeA will already have stored a verified email for each person whose history should be kept. People without that verified email lose the history that was stored under the IdM identifier.

Note: Email-Password accounts already use the email address as their identifier. No re-keying needed for them.

## Switchover

Preparation before downtime:
1. ALeA provides (IdMId <--> email) mapping for the LMS data migration
2. ALeA and LMS perform a dryrun of their respective re-keying script to ensure sanity.

The LMS and ALeA will be down for this duration. The following steps will be followed

1. (Downtime starts) ALeA and the LMS are both shut down.
2. (Mapping resent) ALeA sends the IdM identifier and email mapping again. This file is the one used for the re-key. Collection can continue until shutdown, so the file from the preparation step is not the final one.
3. (Re-keying script - ALeA) ALeA flags IdM `userInfo` rows that have an unverified email, records them, and clears those addresses (password accounts are not cleared). It then rewrites person identifiers in the comments database and the grading database so the user's **verified** email address is the identifier. This includes instructor lists stored in the comments database, and access-list rows stored in the database. Access lists that exist only in memory are rebuilt when ALeA restarts. ALeA does not rewrite Matomo or interview files.
4. (Re-keying script - LMP) LMP re-keys its user model data from the file in step 2.
5. (New tokens minted) LMS restarts and mints tokens with `cdiId`, `email`, or `fakeId`, not `user_id`, for `https://lms.voll-ki.fau.de/login`, `https://lms.voll-ki.fau.de/get-email-access-token`, and `https://lms.voll-ki.fau.de/fake-login`. `getuserinfo` returns the shapes above.
6. (Downtime ends) ALeA restarts with code that accepts the new `getuserinfo` format.