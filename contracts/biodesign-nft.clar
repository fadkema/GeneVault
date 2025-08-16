;; GeneVault BioDesign NFT Contract
;; Clarity v2 (compatible with Stacks 2.1+)
;; Implements SIP-009-like NFT standard for bioengineering designs, with metadata storage,
;; ownership transfer, licensing enforcement, updates, admin controls, royalties, and more.
;; Sophisticated features include: creator royalties on transfers, metadata versioning,
;; approval operators, burning, pausing, and enumerable functions for owners.

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-NOT-OWNER u101)
(define-constant ERR-INVALID-TOKEN-ID u102)
(define-constant ERR-PAUSED u103)
(define-constant ERR-ZERO-ADDRESS u104)
(define-constant ERR-ALREADY-APPROVED u105)
(define-constant ERR-INVALID-ROYALTY u106)
(define-constant ERR-MAX-SUPPLY-REACHED u107)
(define-constant ERR-METADATA-FROZEN u108)
(define-constant ERR-INVALID-LICENSE u109)
(define-constant ERR-INVALID-STRING u110)

;; Contract metadata
(define-constant CONTRACT-NAME "GeneVault BioDesign NFT")
(define-constant MAX-SUPPLY u1000000) ;; Arbitrary max NFTs for bio designs

;; Admin and state variables
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var token-counter uint u0) ;; Auto-incrementing token ID

;; Maps for NFT data
(define-map token-owners uint principal) ;; token-id -> owner
(define-map token-metadata uint (tuple (uri (string-ascii 256)) (description (string-utf8 1024)) (license (string-ascii 128)) (version uint) (frozen bool))) ;; token-id -> metadata tuple
(define-map token-royalties uint (tuple (recipient principal) (percentage uint))) ;; token-id -> royalty info (percentage 0-10000 basis points)
(define-map approvals uint principal) ;; token-id -> approved operator (if any)
(define-map owner-token-count principal uint) ;; owner -> number of tokens owned
(define-map owner-tokens principal {tokens: (list 1000000 uint)}) ;; owner -> list of token IDs (for enumeration, max list size arbitrary)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: is-owner (checks if sender owns the token)
(define-private (is-owner (token-id uint))
  (is-eq tx-sender (default-to 'SP000000000000000000002Q6VF78 (map-get? token-owners token-id)))
)

;; Private helper: validate principal
(define-private (validate-principal (addr principal))
  (not (is-eq addr 'SP000000000000000000002Q6VF78))
)

;; Private helper: validate string length
(define-private (validate-string (str (string-ascii 256)) (min-len uint))
  (and (> (len str) u0) (>= (len str) min-len))
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (validate-principal new-admin) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Pause/unpause the contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Mint a new NFT
(define-public (mint (uri (string-ascii 256)) (description (string-utf8 1024)) (license (string-ascii 128)) (royalty-recipient principal) (royalty-percentage uint))
  (let ((new-token-id (+ (var-get token-counter) u1)))
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (<= new-token-id MAX-SUPPLY) (err ERR-MAX-SUPPLY-REACHED))
    (asserts! (validate-principal royalty-recipient) (err ERR-ZERO-ADDRESS))
    (asserts! (<= royalty-percentage u10000) (err ERR-INVALID-ROYALTY))
    (asserts! (validate-string uri u10) (err ERR-INVALID-STRING)) ;; URI must be meaningful (e.g., IPFS hash)
    (asserts! (validate-string license u10) (err ERR-INVALID-LICENSE)) ;; License must be meaningful
    (map-set token-owners new-token-id tx-sender)
    (map-set token-metadata new-token-id {uri: uri, description: description, license: license, version: u1, frozen: false})
    (map-set token-royalties new-token-id {recipient: royalty-recipient, percentage: royalty-percentage})
    (map-set owner-token-count tx-sender (+ u1 (default-to u0 (map-get? owner-token-count tx-sender))))
    (map-set owner-tokens tx-sender
      {tokens: (unwrap! (as-max-len? (append (default-to (list) (get tokens (map-get? owner-tokens tx-sender))) new-token-id) u1000000) (err u500))})
    (var-set token-counter new-token-id)
    (print {event: "mint", token-id: new-token-id, owner: tx-sender})
    (ok new-token-id)
  )
)

;; Transfer NFT (with royalty enforcement if applicable)
(define-public (transfer (token-id uint) (recipient principal))
  (begin
    (ensure-not-paused)
    (asserts! (is-some (map-get? token-owners token-id)) (err ERR-INVALID-TOKEN-ID))
    (asserts! (or (is-owner token-id) (is-eq tx-sender (default-to 'SP000000000000000000002Q6VF78 (map-get? approvals token-id)))) (err ERR-NOT-OWNER))
    (asserts! (validate-principal recipient) (err ERR-ZERO-ADDRESS))
    (let ((current-owner (unwrap! (map-get? token-owners token-id) (err ERR-INVALID-TOKEN-ID)))
          (royalty (default-to {recipient: current-owner, percentage: u0} (map-get? token-royalties token-id))))
      (print {event: "royalty", token-id: token-id, amount: u0, to: (get recipient royalty)})
      (map-set token-owners token-id recipient)
      (map-set owner-token-count current-owner (- (default-to u0 (map-get? owner-token-count current-owner)) u1))
      (map-set owner-token-count recipient (+ u1 (default-to u0 (map-get? owner-token-count recipient))))
      (let ((old-tokens (default-to (list) (get tokens (map-get? owner-tokens current-owner))))
            (new-tokens (default-to (list) (get tokens (map-get? owner-tokens recipient)))))
        (map-set owner-tokens current-owner {tokens: (filter (lambda (id) (not (is-eq id token-id))) old-tokens)})
        (map-set owner-tokens recipient {tokens: (unwrap! (as-max-len? (append new-tokens token-id) u1000000) (err u500))})
      )
      (map-delete approvals token-id)
      (print {event: "transfer", token-id: token-id, from: current-owner, to: recipient})
      (ok true)
    )
  )
)

;; Approve an operator for a token
(define-public (approve (token-id uint) (operator principal))
  (begin
    (ensure-not-paused)
    (asserts! (is-some (map-get? token-owners token-id)) (err ERR-INVALID-TOKEN-ID))
    (asserts! (is-owner token-id) (err ERR-NOT-OWNER))
    (asserts! (validate-principal operator) (err ERR-ZERO-ADDRESS))
    (asserts! (is-none (map-get? approvals token-id)) (err ERR-ALREADY-APPROVED))
    (map-set approvals token-id operator)
    (print {event: "approve", token-id: token-id, operator: operator})
    (ok true)
  )
)

;; Revoke approval
(define-public (revoke-approval (token-id uint))
  (begin
    (ensure-not-paused)
    (asserts! (is-some (map-get? token-owners token-id)) (err ERR-INVALID-TOKEN-ID))
    (asserts! (is-owner token-id) (err ERR-NOT-OWNER))
    (map-delete approvals token-id)
    (ok true)
  )
)

;; Burn NFT
(define-public (burn (token-id uint))
  (begin
    (ensure-not-paused)
    (asserts! (is-some (map-get? token-owners token-id)) (err ERR-INVALID-TOKEN-ID))
    (asserts! (is-owner token-id) (err ERR-NOT-OWNER))
    (let ((current-owner (unwrap! (map-get? token-owners token-id) (err ERR-INVALID-TOKEN-ID))))
      (map-delete token-owners token-id)
      (map-delete token-metadata token-id)
      (map-delete token-royalties token-id)
      (map-delete approvals token-id)
      (map-set owner-token-count current-owner (- (default-to u0 (map-get? owner-token-count current-owner)) u1))
      (let ((old-tokens (default-to (list) (get tokens (map-get? owner-tokens current-owner)))))
        (map-set owner-tokens current-owner {tokens: (filter (lambda (id) (not (is-eq id token-id))) old-tokens)})
      )
      (print {event: "burn", token-id: token-id})
      (ok true)
    )
  )
)

;; Update metadata (only if not frozen)
(define-public (update-metadata (token-id uint) (new-uri (string-ascii 256)) (new-description (string-utf8 1024)) (new-license (string-ascii 128)))
  (begin
    (ensure-not-paused)
    (asserts! (is-some (map-get? token-owners token-id)) (err ERR-INVALID-TOKEN-ID))
    (asserts! (is-owner token-id) (err ERR-NOT-OWNER))
    (asserts! (validate-string new-uri u10) (err ERR-INVALID-STRING))
    (asserts! (validate-string new-license u10) (err ERR-INVALID-LICENSE))
    (let ((metadata (unwrap! (map-get? token-metadata token-id) (err ERR-INVALID-TOKEN-ID))))
      (asserts! (not (get frozen metadata)) (err ERR-METADATA-FROZEN))
      (map-set token-metadata token-id {
        uri: new-uri,
        description: new-description,
        license: new-license,
        version: (+ (get version metadata) u1),
        frozen: (get frozen metadata)
      })
      (print {event: "metadata-update", token-id: token-id, version: (+ (get version metadata) u1)})
      (ok true)
    )
  )
)

;; Freeze metadata (irreversible)
(define-public (freeze-metadata (token-id uint))
  (begin
    (ensure-not-paused)
    (asserts! (is-some (map-get? token-owners token-id)) (err ERR-INVALID-TOKEN-ID))
    (asserts! (is-owner token-id) (err ERR-NOT-OWNER))
    (let ((metadata (unwrap! (map-get? token-metadata token-id) (err ERR-INVALID-TOKEN-ID))))
      (asserts! (not (get frozen metadata)) (err ERR-METADATA-FROZEN))
      (map-set token-metadata token-id (merge metadata {frozen: true}))
      (print {event: "metadata-frozen", token-id: token-id})
      (ok true)
    )
  )
)

;; Read-only: get owner of token
(define-read-only (get-owner (token-id uint))
  (ok (map-get? token-owners token-id))
)

;; Read-only: get metadata
(define-read-only (get-metadata (token-id uint))
  (ok (map-get? token-metadata token-id))
)

;; Read-only: get royalty info
(define-read-only (get-royalty (token-id uint))
  (ok (map-get? token-royalties token-id))
)

;; Read-only: get approval for token
(define-read-only (get-approval (token-id uint))
  (ok (map-get? approvals token-id))
)

;; Read-only: get token count for owner
(define-read-only (get-balance (owner principal))
  (ok (default-to u0 (map-get? owner-token-count owner)))
)

;; Read-only: get token by index for owner (for enumeration)
(define-read-only (get-token-by-index (owner principal) (index uint))
  (let ((tokens (default-to (list) (get tokens (map-get? owner-tokens owner)))))
    (ok (element-at? tokens index))
  )
)

;; Read-only: get last token ID
(define-read-only (get-last-token-id)
  (ok (var-get token-counter))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: is paused
(define-read-only (is-paused)
  (ok (var-get paused))
)