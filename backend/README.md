+-----------+
|  Client   |
+-----------+
      |
      | Login / Register
      v
+----------------+
| Backend Auth   |
+----------------+
      |
      | JWT Auth Middleware
      v
+--------------------------+
| Authenticated Request?   |
+--------------------------+
      | Yes                         | No
      v                             v
+----------------+         Return 401 Unauthorized
| Route Selection|
+----------------+
   /           \
Clubs Routes    Event Routes
   |               |
   v               v
+--------+       +--------+
| Clubs  |       | Events |
+--------+       +--------+
| members/pending | registered/attended |
+----------------+----------------------+
       |                      |
       |                      |
       v                      v
+-----------------------------------+
|   Database Access (CRUD Ops)      |
| Users / Clubs / Events Tables     |
+-----------------------------------+
       |                      
       | Handle edge cases:      
       | - User already in club? Reject/Add to pending  
       | - User attending event? Check registration status
       | - Event full? Reject registration
       v
+----------------------+
| Return Response      |
| Success / Failure    |
+----------------------+
      |
      v
+-----------+
|  Client   |
+-----------+
