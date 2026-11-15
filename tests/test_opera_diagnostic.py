import numpy as np
from opera_export import assess


def test_all_water_is_flagged_as_suspicious_not_successful_detection():
    assert assess(np.ones((10,10),dtype=np.uint8),'')[1] is False


def test_no_valid_data_is_not_an_acceptable_result():
    assert assess(np.full((10,10),255,dtype=np.uint8),'') == (0.0,False)


def test_empty_threshold_warning_rejects_otherwise_plausible_fraction():
    a=np.zeros((10,10),dtype=np.uint8);a[0,:]=1
    assert assess(a,'threshold array is empty')[1] is False
    assert assess(a,'')[1] is True  # plausibility only, not scientific validation
