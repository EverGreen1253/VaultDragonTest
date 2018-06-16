CREATE TABLE public.vd_test_2
(
    id bigserial NOT NULL,
    obj_key character varying(255),
    obj_value jsonb,
    date_added timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
);