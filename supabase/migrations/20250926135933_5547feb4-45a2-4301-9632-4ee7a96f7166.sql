-- Clear existing data and populate with the 10 specific gyms
DELETE FROM gym_colors;
DELETE FROM gym_logos;
DELETE FROM gym_elements;
DELETE FROM gyms;

-- Insert the 10 specific gyms
INSERT INTO gyms (name, code) VALUES
('Capital Gymnastics Cedar Park', 'CCP'),
('Capital Gymnastics Pflugerville', 'CPF'),
('Capital Gymnastics Round Rock', 'CRR'),
('Houston Gymnastics Academy', 'HGA'),
('Rowland Ballard Atascocita', 'RBA'),
('Rowland Ballard Kingwood', 'RBK'),
('Estrella Gymnastics', 'EST'),
('Oasis Gymnastics', 'OAS'),
('Scottsdale Gymnastics', 'SGT'),
('Tigar Gymnastics', 'TIG');

-- Insert colors for Capital Gymnastics Cedar Park
INSERT INTO gym_colors (gym_id, color_hex, order_index)
SELECT id, '#1f53a3', 0 FROM gyms WHERE code = 'CCP'
UNION ALL
SELECT id, '#bf0a30', 1 FROM gyms WHERE code = 'CCP'
UNION ALL
SELECT id, '#d8d8d8', 2 FROM gyms WHERE code = 'CCP'
UNION ALL
SELECT id, '#ffffff', 3 FROM gyms WHERE code = 'CCP'

UNION ALL

-- Insert colors for Capital Gymnastics Pflugerville
SELECT id, '#1f53a3', 0 FROM gyms WHERE code = 'CPF'
UNION ALL
SELECT id, '#bf0a30', 1 FROM gyms WHERE code = 'CPF'
UNION ALL
SELECT id, '#d8d8d8', 2 FROM gyms WHERE code = 'CPF'
UNION ALL
SELECT id, '#ffffff', 3 FROM gyms WHERE code = 'CPF'

UNION ALL

-- Insert colors for Capital Gymnastics Round Rock
SELECT id, '#ff1493', 0 FROM gyms WHERE code = 'CRR'
UNION ALL
SELECT id, '#c0c0c0', 1 FROM gyms WHERE code = 'CRR'
UNION ALL
SELECT id, '#ffffff', 2 FROM gyms WHERE code = 'CRR'

UNION ALL

-- Insert colors for Houston Gymnastics Academy
SELECT id, '#c91724', 0 FROM gyms WHERE code = 'HGA'
UNION ALL
SELECT id, '#262626', 1 FROM gyms WHERE code = 'HGA'
UNION ALL
SELECT id, '#d0d0d8', 2 FROM gyms WHERE code = 'HGA'
UNION ALL
SELECT id, '#ffffff', 3 FROM gyms WHERE code = 'HGA'

UNION ALL

-- Insert colors for Rowland Ballard Atascocita
SELECT id, '#1a3c66', 0 FROM gyms WHERE code = 'RBA'
UNION ALL
SELECT id, '#c52928', 1 FROM gyms WHERE code = 'RBA'
UNION ALL
SELECT id, '#739ab9', 2 FROM gyms WHERE code = 'RBA'
UNION ALL
SELECT id, '#ffffff', 3 FROM gyms WHERE code = 'RBA'

UNION ALL

-- Insert colors for Rowland Ballard Kingwood
SELECT id, '#1a3c66', 0 FROM gyms WHERE code = 'RBK'
UNION ALL
SELECT id, '#c52928', 1 FROM gyms WHERE code = 'RBK'
UNION ALL
SELECT id, '#739ab9', 2 FROM gyms WHERE code = 'RBK'
UNION ALL
SELECT id, '#ffffff', 3 FROM gyms WHERE code = 'RBK'

UNION ALL

-- Insert colors for Estrella Gymnastics
SELECT id, '#011837', 0 FROM gyms WHERE code = 'EST'
UNION ALL
SELECT id, '#666666', 1 FROM gyms WHERE code = 'EST'
UNION ALL
SELECT id, '#100f0f', 2 FROM gyms WHERE code = 'EST'
UNION ALL
SELECT id, '#ffffff', 3 FROM gyms WHERE code = 'EST'

UNION ALL

-- Insert colors for Oasis Gymnastics
SELECT id, '#3eb29f', 0 FROM gyms WHERE code = 'OAS'
UNION ALL
SELECT id, '#3e266b', 1 FROM gyms WHERE code = 'OAS'
UNION ALL
SELECT id, '#e7e6f0', 2 FROM gyms WHERE code = 'OAS'
UNION ALL
SELECT id, '#ffffff', 3 FROM gyms WHERE code = 'OAS'

UNION ALL

-- Insert colors for Scottsdale Gymnastics
SELECT id, '#c72b12', 0 FROM gyms WHERE code = 'SGT'
UNION ALL
SELECT id, '#e6e6e6', 1 FROM gyms WHERE code = 'SGT'
UNION ALL
SELECT id, '#000000', 2 FROM gyms WHERE code = 'SGT'
UNION ALL
SELECT id, '#ffffff', 3 FROM gyms WHERE code = 'SGT'

UNION ALL

-- Insert colors for Tigar Gymnastics
SELECT id, '#f57f20', 0 FROM gyms WHERE code = 'TIG'
UNION ALL
SELECT id, '#0a3651', 1 FROM gyms WHERE code = 'TIG'
UNION ALL
SELECT id, '#7fc4e0', 2 FROM gyms WHERE code = 'TIG';