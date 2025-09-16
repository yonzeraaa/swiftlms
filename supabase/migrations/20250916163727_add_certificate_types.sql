-- Add certificate_type tracking to certificate requests and certificates
ALTER TABLE public.certificate_requests
ADD COLUMN IF NOT EXISTS certificate_type text DEFAULT 'technical';

UPDATE public.certificate_requests
SET certificate_type = COALESCE(NULLIF(certificate_type, ''), 'technical');

ALTER TABLE public.certificate_requests
ALTER COLUMN certificate_type SET NOT NULL;

ALTER TABLE public.certificate_requests
ADD CONSTRAINT certificate_requests_certificate_type_check
CHECK (certificate_type IN ('technical', 'lato-sensu'));

ALTER TABLE public.certificate_requests
ADD CONSTRAINT certificate_requests_enrollment_type_key
UNIQUE (enrollment_id, certificate_type);

ALTER TABLE public.certificates
ADD COLUMN IF NOT EXISTS certificate_type text DEFAULT 'technical';

UPDATE public.certificates
SET certificate_type = COALESCE(NULLIF(certificate_type, ''), 'technical');

ALTER TABLE public.certificates
ALTER COLUMN certificate_type SET NOT NULL;

ALTER TABLE public.certificates
ADD CONSTRAINT certificates_certificate_type_check
CHECK (certificate_type IN ('technical', 'lato-sensu'));

ALTER TABLE public.certificates
ADD CONSTRAINT certificates_enrollment_type_key
UNIQUE (enrollment_id, certificate_type);
